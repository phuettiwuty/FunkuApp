// src/screens/SongsGlobalScreen.js
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Image,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import {
  addSongByURL,
  subscribeSongs,
  removeSong,
  updateSong,
} from '../services/songs.global';

export default function SongsGlobalScreen() {
  // ฟอร์มเพิ่มเพลงใหม่ (URL)
  const [form, setForm] = useState({ name: '', artist: '', url: '', logo: '' });

  // ลิสต์เพลงแบบ realtime
  const [list, setList] = useState([]);

  // เล่นเพลง
  const soundRef = useRef(null);
  const [currentId, setCurrentId] = useState(null);

  // โหมดแก้ไข
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', artist: '', url: '', logo: '' });
  const [saving, setSaving] = useState(false);

  // READ: subscribe realtime + ตั้งค่า Audio mode (iOS เล่นในโหมดเงียบ)
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(() => {});

    const unsub = subscribeSongs(setList);
    return () => {
      unsub();
      unloadSound();
    };
  }, []);

  // ทำความสะอาดเครื่องเล่น
  const unloadSound = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch {}
  };

  // WRITE: เพิ่มเพลง (URL)
  const onSave = async () => {
    try {
      const { name, artist, url, logo } = form;
      if (!name || !artist || !url) {
        Alert.alert('ข้อมูลไม่ครบ', 'กรุณากรอก name / artist / url');
        return;
      }
      await addSongByURL({ name, artist, url, logo });
      setForm({ name: '', artist: '', url: '', logo: '' });
      Alert.alert('สำเร็จ', 'บันทึกเพลงแล้ว');
    } catch (e) {
      Alert.alert('บันทึกไม่สำเร็จ', String(e?.message || e));
    }
  };

  // เล่น/หยุดเพลง
  const onPlay = async (item) => {
    try {
      // หากกดเพลงเดียวกับที่กำลังเล่น → หยุด
      if (currentId === item.id && soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await soundRef.current.pauseAsync();
          setCurrentId(null);
          return;
        }
      }
      // เล่นเพลงใหม่
      await unloadSound();
      const { sound } = await Audio.Sound.createAsync({ uri: item.url });
      soundRef.current = sound;
      setCurrentId(item.id);
      await sound.playAsync();

      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          setCurrentId(null);
          unloadSound();
        }
      });
    } catch (e) {
      Alert.alert('เล่นไม่ได้', String(e?.message || e));
    }
  };

  // ลบเพลง
  const onDelete = async (id) => {
    try {
      await removeSong(id); // ลบเฉพาะเอกสาร Firestore
    } catch (e) {
      Alert.alert('ลบไม่สำเร็จ', String(e?.message || e));
    }
  };

  // เข้าโหมดแก้ไข
  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({
      name: item.name || '',
      artist: item.artist || '',
      url: item.url || '',
      logo: item.logo || '',
    });
  };

  // ยกเลิกแก้ไข
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', artist: '', url: '', logo: '' });
  };

  // บันทึกการแก้ไข
  const saveEdit = async () => {
    try {
      if (!editForm.name || !editForm.artist || !editForm.url) {
        Alert.alert('ข้อมูลไม่ครบ', 'กรุณากรอก name / artist / url');
        return;
      }
      setSaving(true);
      await updateSong(editingId, {
        name: editForm.name,
        artist: editForm.artist,
        url: editForm.url,
        logo: editForm.logo,
      });
      setSaving(false);
      cancelEdit();
      Alert.alert('สำเร็จ', 'แก้ไขแล้ว');
    } catch (e) {
      setSaving(false);
      Alert.alert('บันทึกไม่สำเร็จ', String(e?.message || e));
    }
  };

  // -------- renderItem (รองรับโหมดแก้ไข & ปกติ) --------
  const renderItem = ({ item }) => {
    const isEditing = editingId === item.id;

    if (isEditing) {
      return (
        <View style={styles.card}>
          <Text style={styles.editTitle}>แก้ไขเพลง</Text>

          <TextInput
            style={styles.input}
            placeholder="name"
            value={editForm.name}
            onChangeText={(t) => setEditForm({ ...editForm, name: t })}
          />

          <TextInput
            style={styles.input}
            placeholder="artist"
            value={editForm.artist}
            onChangeText={(t) => setEditForm({ ...editForm, artist: t })}
          />

          <TextInput
            style={styles.input}
            placeholder="url (เพลง) — https://..."
            autoCapitalize="none"
            value={editForm.url}
            onChangeText={(t) => setEditForm({ ...editForm, url: t })}
          />

          <TextInput
            style={styles.input}
            placeholder="logo (ออปชัน) — https://..."
            autoCapitalize="none"
            value={editForm.logo}
            onChangeText={(t) => setEditForm({ ...editForm, logo: t })}
          />

          <View style={styles.row}>
            <TouchableOpacity style={styles.btn} onPress={saveEdit} disabled={saving}>
              <Text style={styles.btnText}>{saving ? 'กำลังบันทึก…' : 'บันทึก'}</Text>
            </TouchableOpacity>
            <View style={{ width: 8 }} />
            <TouchableOpacity style={styles.btnGray} onPress={cancelEdit} disabled={saving}>
              <Text style={styles.btnText}>ยกเลิก</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <View style={styles.itemHeader}>
          {!!item.logo && <Image source={{ uri: item.logo }} style={styles.logo} />}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.title} numberOfLines={1}>
              {item.name} — {item.artist}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              url: {item.url}
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          <TouchableOpacity style={styles.btn} onPress={() => onPlay(item)}>
            <Text style={styles.btnText}>{currentId === item.id ? 'หยุด' : 'เล่น'}</Text>
          </TouchableOpacity>
          <View style={{ width: 8 }} />
          <TouchableOpacity style={styles.btnWarn} onPress={() => startEdit(item)}>
            <Text style={styles.btnText}>แก้ไข</Text>
          </TouchableOpacity>
          <View style={{ width: 8 }} />
          <TouchableOpacity style={styles.btnDanger} onPress={() => onDelete(item.id)}>
            <Text style={styles.btnText}>ลบ</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Global Songs (URL)</Text>

      {/* ฟอร์มเพิ่มเพลงใหม่ */}
      <TextInput
        style={styles.input}
        placeholder="name"
        value={form.name}
        onChangeText={(t) => setForm({ ...form, name: t })}
      />
      <TextInput
        style={styles.input}
        placeholder="artist"
        value={form.artist}
        onChangeText={(t) => setForm({ ...form, artist: t })}
      />
      <TextInput
        style={styles.input}
        placeholder="url (เพลง) — https://..."
        autoCapitalize="none"
        value={form.url}
        onChangeText={(t) => setForm({ ...form, url: t })}
      />
      <TextInput
        style={styles.input}
        placeholder="logo (ออปชัน) — https://..."
        autoCapitalize="none"
        value={form.logo}
        onChangeText={(t) => setForm({ ...form, logo: t })}
      />

      <Button title="บันทึก (URL)" onPress={onSave} />

      {/* รายการเพลง */}
      <FlatList
        data={list}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 8 }}
        ListEmptyComponent={
          <Text style={[styles.meta, { marginTop: 12 }]}>
            ยังไม่มีเพลง — เพิ่มเพลงแรกของคุณได้เลย!
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: Platform.OS === 'android' ? 24 : 16 },
  h1: { fontSize: 22, fontWeight: '700', marginBottom: 12 },

  // inputs
  input: {
    borderWidth: 1,
    borderColor: '#dcdcdc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },

  // list item
  card: {
    marginTop: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '600' },
  meta: { marginTop: 4, color: '#555' },
  logo: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#ddd', marginRight: 12 },

  // buttons
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  btn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnWarn: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnDanger: {
    backgroundColor: '#e11d48',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnGray: {
    backgroundColor: '#6b7280',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnText: { color: 'white', fontWeight: '600' },

  // edit section
  editTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
});
