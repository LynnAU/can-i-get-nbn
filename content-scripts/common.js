const PUBLIC_API_URI = 'https://api.canigetnbn.aterrible.dev';

// this calls an api that can be found in `api.go`
// this is because the way the nbn api is setup it only accepts requests from its domain
// 'https://www.nbnco.com.au/'
// if I could, I'd have the request on the client side for transparency sake...
async function queryBackendForLocationId (address) {
  const uri = `${PUBLIC_API_URI}/location/id?address=${address.replace(' ', '%20')}`;
  const resp = await fetch(uri, { method: 'GET' });
  const json = await resp.json();

  return json.location;
}

// same as above, but it's another endpoint for the custom api written in `api.go`.
async function queryBackendForTechnologyType (locationId) {
  const uri = `${PUBLIC_API_URI}/technology/${locationId}`;
  const resp = await fetch(uri, { method: 'GET' });
  const json = await resp.json();

  return json.technology;
}
