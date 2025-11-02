// src/screens/SearchScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, FlatList, Image, TouchableOpacity,
} from 'react-native';
import { db } from '../firebase/config';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';

export default function SearchScreen() {
  const [allSongs, setAllSongs] = useState([]);
  const [qtext, setQtext] = useState('');

  // ดึง songs ทั้งหมดแบบ realtime (ถ้าโตมากค่อยเปลี่ยนเป็น indexed search)
  useEffect(() => {
    const qy = query(collection(db, 'songs'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(qy, (snap) => {
      const list = snap.docs.map((d) => {
        const x = d.data() || {};
        return {
          id: d.id,
          title: x.name || 'Untitled',
          artist: x.artist || '',
          url: x.url || '',
          cover: x.logo || '',
        };
      });
      setAllSongs(list);
    });
    return () => unsub();
  }, []);

  // กรองด้วย includes (lowercase) ทั้งชื่อเพลง + ศิลปิน
  const results = useMemo(() => {
    const s = qtext.trim().toLowerCase();
    if (!s) return allSongs;
    return allSongs.filter(
      (it) =>
        it.title.toLowerCase().includes(s) ||
        it.artist.toLowerCase().includes(s)
    );
  }, [qtext, allSongs]);

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.row}>
      <Image
        source={{ uri: item.cover || 'https://i.imgur.com/7QdY7Yp.png' }}
        style={styles.thumb}
      />
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={styles.title}>{item.title}</Text>
        <Text numberOfLines={1} style={styles.sub}>{item.artist}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* แถบค้นหา */}
      <View style={styles.searchBox}>
        <TextInput
          placeholder="Search by song or artist…"
          placeholderTextColor="#9ca3af"
          value={qtext}
          onChangeText={setQtext}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {qtext ? (
          <Text onPress={() => setQtext('')} style={styles.clear}>×</Text>
        ) : null}
      </View>

      {/* ผลลัพธ์ */}
      <FlatList
        data={results}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={styles.empty}>No results</Text>
        }
        contentContainerStyle={{ paddingBottom: 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0b', paddingTop: 10, paddingHorizontal: 12 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1a1a', borderRadius: 12, paddingHorizontal: 12, height: 44, marginBottom: 10,
  },
  input: { flex: 1, color: 'white' },
  clear: { color: '#9ca3af', fontSize: 22, paddingLeft: 8, paddingRight: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#151515', padding: 10, borderRadius: 12, marginBottom: 8,
  },
  thumb: { width: 48, height: 48, borderRadius: 8, marginRight: 10, backgroundColor: '#222' },
  title: { color: 'white', fontWeight: '700' },
  sub: { color: '#9ca3af', marginTop: 2, fontSize: 12 },
  empty: { color: '#9ca3af', textAlign: 'center', marginTop: 24 },
});
