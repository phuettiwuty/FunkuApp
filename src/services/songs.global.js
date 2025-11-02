// src/services/songs.global.js
import { db } from '../firebase/config';
import {
  collection, addDoc, serverTimestamp, query, orderBy,
  onSnapshot, getDocs, doc, updateDoc, deleteDoc
} from 'firebase/firestore';

const SONGS_COLLECTION = 'songs'; // global collection

// ตรวจสอบว่าเป็น URL ที่พอใช้ได้ (ง่ายๆ)
function isValidURL(s) {
  try { new URL(s); return true; } catch { return false; }
}

// ---------- CREATE (URL เท่านั้น) ----------
export async function addSongByURL({ name, artist, url, logo }) {
  if (![name, artist, url].every(v => typeof v === 'string' && v.trim())) {
    throw new Error('กรุณากรอก name, artist, url ให้ครบ');
  }
  if (!isValidURL(url)) throw new Error('URL เพลงไม่ถูกต้อง');
  if (logo && !isValidURL(logo)) throw new Error('URL โลโก้ไม่ถูกต้อง');

  // WRITE: Firestore
  const ref = await addDoc(collection(db, SONGS_COLLECTION), {
    name: name.trim(),
    artist: artist.trim(),
    url: url.trim(),     // <-- เก็บเป็น string URL
    logo: (logo || '').trim(),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// ---------- READ (One-shot) ----------
export async function fetchSongsOnce() {
  const q = query(collection(db, SONGS_COLLECTION), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ---------- READ (Realtime) ----------
export function subscribeSongs(callback) {
  const q = query(collection(db, SONGS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(list);
  });
}

// UPDATE: อนุญาตแก้ name / artist / url / logo (ตรวจ URL ให้ด้วย) + ประทับเวลา updatedAt
export async function updateSong(id, data) {
  const payload = { updatedAt: serverTimestamp() };

  if (typeof data.name === 'string') {
    const v = data.name.trim();
    if (!v) throw new Error('name ห้ามว่าง');
    payload.name = v;
  }

  if (typeof data.artist === 'string') {
    const v = data.artist.trim();
    if (!v) throw new Error('artist ห้ามว่าง');
    payload.artist = v;
  }

  if (typeof data.url === 'string') {
    const v = data.url.trim();
    if (!v) throw new Error('url ห้ามว่าง');
    if (!isValidURL(v)) throw new Error('URL เพลงไม่ถูกต้อง');
    payload.url = v;
  }

  if (typeof data.logo === 'string') {
    const v = data.logo.trim();
    // อนุญาตว่างได้ (ไม่มีโลโก้)
    if (v && !isValidURL(v)) throw new Error('URL โลโก้ไม่ถูกต้อง');
    payload.logo = v;
  }

  await updateDoc(doc(db, 'songs', id), payload);
}

// ---------- DELETE ----------
export async function removeSong(id) {
  await deleteDoc(doc(db, SONGS_COLLECTION, id));
}


