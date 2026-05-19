const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const ROOT_FOLDER_NAME = 'FacturApp';

let tokenClient = null;
let accessToken = null;

function loadGoogleAPI() {
  return new Promise((resolve) => {
    if (window.google?.accounts) return resolve();
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = resolve;
    document.head.appendChild(script);
  });
}

function loadGoogleDriveAPI() {
  return new Promise((resolve) => {
    if (window.gapi?.client) return resolve();
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      window.gapi.load('client', async () => {
        await window.gapi.client.init({});
        await window.gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest');
        resolve();
      });
    };
    document.head.appendChild(script);
  });
}

async function getAccessToken() {
  await loadGoogleAPI();
  await loadGoogleDriveAPI();

  return new Promise((resolve, reject) => {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (response) => {
        if (response.error) return reject(response.error);
        accessToken = response.access_token;
        window.gapi.client.setToken({ access_token: accessToken });
        resolve(accessToken);
      },
    });
    tokenClient.requestAccessToken({ prompt: accessToken ? '' : 'consent' });
  });
}

async function findOrCreateFolder(name, parentId = null) {
  const query = parentId
    ? `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
    : `name='${name}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false`;

  const res = await window.gapi.client.drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (res.result.files.length > 0) {
    return res.result.files[0].id;
  }

  // Crear la carpeta
  const metadata = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    ...(parentId ? { parents: [parentId] } : {}),
  };

  const created = await window.gapi.client.drive.files.create({
    resource: metadata,
    fields: 'id',
  });

  return created.result.id;
}

async function uploadPDF(pdfBlob, filename, folderId) {
  const metadata = {
    name: filename,
    mimeType: 'application/pdf',
    parents: [folderId],
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', pdfBlob);

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  return await res.json();
}

export async function saveInvoiceToDrive(invoice, pdfBlob) {
  try {
    await getAccessToken();

    const clientName = invoice.receptor_nombre || 'Sin nombre';
    const fecha = invoice.fecha_emision || new Date().toISOString().split('T')[0];
    const mes = fecha.substring(0, 7); // "2026-05"
    const filename = `FAC-${invoice.numero_factura}.pdf`;

    // Estructura: FacturApp / Cliente / YYYY-MM /
    const rootId = await findOrCreateFolder(ROOT_FOLDER_NAME);
    const clientId = await findOrCreateFolder(clientName, rootId);
    const monthId = await findOrCreateFolder(mes, clientId);

    const uploaded = await uploadPDF(pdfBlob, filename, monthId);

    return {
      success: true,
      fileId: uploaded.id,
      fileName: uploaded.name,
      link: uploaded.webViewLink,
    };
  } catch (error) {
    console.error('Error guardando en Drive:', error);
    return { success: false, error: error.message || error };
  }
}

export async function isConnectedToDrive() {
  return !!accessToken;
}

export async function connectToDrive() {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}
