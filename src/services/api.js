import { supabase } from '../config/supabaseClient';

class ApiClient {
  constructor() {
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  getToken() {
    return this.token;
  }

  async get(path) {
    if (path === '/employees') {
      const { data, error } = await supabase.from('employees').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    if (path === '/surveys') {
      const { data, error } = await supabase.from('surveys').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    if (path.startsWith('/surveys/')) {
        const id = path.split('/')[2];
        const { data, error } = await supabase.from('surveys').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    }
    if (path === '/trips') {
      const { data, error } = await supabase.from('trips').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    if (path.startsWith('/settings/')) {
        const key = path.split('/')[2];
        try {
            const { data, error } = await supabase.from('settings').select('value').eq('key', key).single();
            if (error) {
                if (error.code === 'PGRST116' || error.code === '42P01') return null; // Not found or table doesn't exist
                throw error;
            }
            return data;
        } catch (err) {
            console.warn(`Settings ${key} fetch failed, maybe missing table. Error:`, err.message);
            return null; // Graceful degradation for Maps and Settings
        }
    }
    return [];
  }
  
  // Map camelCase form fields to snake_case Supabase columns
  _mapEmployeeFields(body) {
    const mapped = { ...body };
    // Map currentAddress -> current_address
    if ('currentAddress' in mapped) {
      mapped.current_address = mapped.currentAddress;
      delete mapped.currentAddress;
    }
    return mapped;
  }

  _mapTripFields(body) {
    const mapped = { ...body };
    // Map startDate -> start_date
    if ('startDate' in mapped) {
      mapped.start_date = mapped.startDate;
      delete mapped.startDate;
    }
    // Map endDate -> end_date
    if ('endDate' in mapped) {
      mapped.end_date = mapped.endDate;
      delete mapped.endDate;
    }
    return mapped;
  }

  async post(path, body) {
    if (path === '/employees') {
        const mapped = this._mapEmployeeFields(body);
        const { data, error } = await supabase.from('employees').insert(mapped).select().single();
        if (error) throw error;
        return data;
    }
    if (path === '/surveys') {
        const uploadedData = await this.uploadMediaItems(body);
        const { data, error } = await supabase.from('surveys').insert(uploadedData).select().single();
        if (error) throw error;
        return data;
    }
    if (path === '/employees/import') {
        const rows = (body.employees || []).map(e => this._mapEmployeeFields(e));
        if (rows.length === 0) return { imported: 0 };
        const { data, error } = await supabase.from('employees').insert(rows).select();
        if (error) throw error;
        return { imported: data?.length || 0 };
    }
    if (path === '/trips') {
        const mapped = this._mapTripFields(body);
        const { data, error } = await supabase.from('trips').insert(mapped).select().single();
        if (error) throw error;
        return data;
    }
    throw new Error(`Endpoint POST ${path} not mapped to Supabase`);
  }

  async put(path, body) {
    if (path.startsWith('/employees/')) {
        const id = path.split('/')[2];
        const mapped = this._mapEmployeeFields(body);
        const { data, error } = await supabase.from('employees').update(mapped).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }
    if (path.startsWith('/surveys/')) {
        const id = path.split('/')[2];
        const uploadedData = await this.uploadMediaItems(body);
        const { data, error } = await supabase.from('surveys').update(uploadedData).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }
    if (path.startsWith('/trips/')) {
        const id = path.split('/')[2];
        const mapped = this._mapTripFields(body);
        const { data, error } = await supabase.from('trips').update(mapped).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }
    if (path.startsWith('/settings/')) {
        const key = path.split('/')[2];
        try {
            const { data: exist } = await supabase.from('settings').select('id').eq('key', key).maybeSingle();
            let error;
            if (exist) {
                const res = await supabase.from('settings').update({ value: body.value }).eq('key', key);
                error = res.error;
            } else {
                const res = await supabase.from('settings').insert({ key, value: body.value });
                error = res.error;
            }
            if (error) throw error;
            return { success: true };
        } catch(err) {
            console.error('Failed to save settings (ensure table exists):', err);
            throw new Error('Database config missing settings table.');
        }
    }
    throw new Error(`Endpoint PUT ${path} not mapped to Supabase`);
  }

  async delete(path) {
    if (path.startsWith('/employees/')) {
        const id = path.split('/')[2];
        const { error } = await supabase.from('employees').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    }
    if (path.startsWith('/surveys/')) {
        const id = path.split('/')[2];
        const { error } = await supabase.from('surveys').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    }
    if (path.startsWith('/trips/')) {
        const id = path.split('/')[2];
        const { error } = await supabase.from('trips').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    }
    throw new Error(`Endpoint DELETE ${path} not mapped to Supabase`);
  }

  // Upload helper for Survey Media
  async uploadMediaItems(body) {
      // Create a shallow copy
      const data = { ...body };
      
      const uploadItem = async (folder, namePrefix, base64OrBlobStr) => {
          if (!base64OrBlobStr || typeof base64OrBlobStr !== 'string' || base64OrBlobStr.startsWith('http')) return base64OrBlobStr;
          
          let blob;
          let ext = 'jpg';
          if (base64OrBlobStr.startsWith('data:')) {
              // Extract base64
              const arr = base64OrBlobStr.split(',');
              const mimeMatch = arr[0].match(/:(.*?);/);
              if (!mimeMatch) return base64OrBlobStr;
              const mime = mimeMatch[1];
              ext = mime.split('/')[1] || 'jpg';
              if (ext === 'webm' || ext === 'mp4' || mime.includes('audio')) ext = 'webm'; // audio
              
              const bstr = atob(arr[1]);
              let n = bstr.length;
              const u8arr = new Uint8Array(n);
              while(n--){
                  u8arr[n] = bstr.charCodeAt(n);
              }
              blob = new Blob([u8arr], {type:mime});
          } else {
             return base64OrBlobStr; // fallback if it's not dataURL
          }

          const fileName = `${folder}/${namePrefix}-${Date.now()}-${Math.floor(Math.random()*1000)}.${ext}`;
          
          const { error } = await supabase.storage
              .from('survey-media')
              .upload(fileName, blob, { upsert: true, contentType: blob.type });
              
          if (error) {
              console.error('Upload Error:', error);
              return base64OrBlobStr; // Return original on error to save it anyway (not ideal but safe)
          }

          const { data: publicUrlData } = supabase.storage
               .from('survey-media')
               .getPublicUrl(fileName);

          return publicUrlData.publicUrl;
      }

      if (data.data) {
          // deep copy data
          data.data = { ...data.data };
          if (data.data.photo0) data.data.photo0 = await uploadItem('photos', 'p0', data.data.photo0);
          if (data.data.photo1) data.data.photo1 = await uploadItem('photos', 'p1', data.data.photo1);
          if (data.data.photo2) data.data.photo2 = await uploadItem('photos', 'p2', data.data.photo2);
          if (data.data.audioBlob) data.data.audioBlob = await uploadItem('audio', 'audio', data.data.audioBlob);
      }
      if (data.signature) {
          data.signature = await uploadItem('signatures', 'sig', data.signature);
      }
      return data;
  }
}

const api = new ApiClient();
export default api;
