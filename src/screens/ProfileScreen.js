// src/screens/ProfileScreen.js
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, StatusBar, Image,
  TouchableOpacity, FlatList, TextInput, Alert, Platform, Animated, Pressable
} from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useNavigation } from '@react-navigation/native';

import { auth, db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile, signOut } from 'firebase/auth';
import { IconButton } from 'react-native-paper';

export default function ProfileScreen({ currentUser }) {
  const navigation = useNavigation();
  const headerHeight = useHeaderHeight();
  const { user: ctxUser, profileDoc } = useAuth();
  const user = currentUser || ctxUser || auth.currentUser;

  const [likes, setLikes] = useState([]);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [isPremium, setIsPremium] = useState(false);

  const isJed =
    (user?.displayName?.toLowerCase?.() === 'jed') ||
    (profileDoc?.displayName?.toLowerCase?.() === 'jed');

  // slide-out panel
  const PANEL_WIDTH = 300;
  const [panelOpen, setPanelOpen] = useState(false);
  const slideX = useRef(new Animated.Value(PANEL_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const openPanel = () => {
    setPanelOpen(true);
    Animated.parallel([
      Animated.timing(slideX, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };
  const closePanel = () => {
    Animated.parallel([
      Animated.timing(slideX, { toValue: PANEL_WIDTH, duration: 200, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(({ finished }) => finished && setPanelOpen(false));
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (<IconButton icon="menu" onPress={openPanel} accessibilityLabel="Open menu" />),
      headerTitle: 'Profile',
    });
  }, [navigation]);

  // likes realtime
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(collection(db, 'users', user.uid, 'likes'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setLikes(list);
    });
    return () => unsub && unsub();
  }, [user?.uid]);

  // premium realtime
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      setIsPremium(!!snap.data()?.premium);
    });
    return () => unsub && unsub();
  }, [user?.uid]);

  const likedCount = likes.length;

  // save profile
  const saveProfile = async () => {
    try {
      const newName = (displayName || '').trim();
      await updateProfile(auth.currentUser, { displayName: newName || auth.currentUser.displayName, photoURL: photoURL || null });
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: newName || null, photoURL: photoURL || null, updatedAt: serverTimestamp(),
      });
      setEditing(false);
      Alert.alert('สำเร็จ', 'อัปเดตโปรไฟล์แล้ว');
    } catch (e) {
      Alert.alert('อัปเดตไม่สำเร็จ', String(e?.message || e));
    }
  };

  // logout → กลับหน้า Login
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (e) { Alert.alert('ออกจากระบบไม่สำเร็จ', String(e?.message || e)); }
  };

  // ใช้ replace เพื่อไม่ซ้อน stack
  const goHome = () => navigation.replace('Main');

  const MenuItem = ({ title, onPress, danger }) => (
    <TouchableOpacity onPress={onPress} style={styles.menuItem}>
      <Text style={[styles.menuText, danger && { color: '#ef4444' }]}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle={Platform.OS === 'ios' ? 'dark-content' : 'default'} />
      <View style={{ height: headerHeight }} />

      {/* Header card */}
      <View style={styles.topCard}>
        <View style={styles.avatarWrapper}>
          <Image
            source={{ uri: photoURL || user?.photoURL || 'https://i.imgur.com/7QdY7Yp.png' }}
            style={styles.avatar}
          />
        </View>

        {!editing ? (
          <>
            <Text style={styles.name}>
              {user?.displayName || 'User'}
              {isPremium && <Text style={styles.premiumBadge}>  premium</Text>}
            </Text>
            <Text style={styles.subText}>{user?.email}</Text>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{likedCount}</Text>
                <Text style={styles.statLabel}>Liked</Text>
              </View>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.name}>Edit profile</Text>
            <View style={{ width: '100%', paddingHorizontal: 16, marginTop: 8 }}>
              <TextInput style={styles.input} placeholder="displayName" value={displayName} onChangeText={setDisplayName} />
              <TextInput style={styles.input} placeholder="photoURL (optional)" value={photoURL} onChangeText={setPhotoURL} autoCapitalize="none" />
              <TouchableOpacity style={[styles.editBtn, { marginTop: 6 }]} onPress={saveProfile}>
                <Text style={styles.editBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Liked list */}
      <View style={styles.sectionTitleWrap}><Text style={styles.sectionTitle}>Songs you liked</Text></View>
      <View style={styles.listCard}>
        <FlatList
          data={likes}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {!!item.logo && <Image source={{ uri: item.logo }} style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: '#ddd' }} />}
                <View style={{ flex: 1 }}>
                  <Text style={styles.listItemTitle} numberOfLines={1}>{item.name} — {item.artist}</Text>
                  <Text style={styles.listItemSub} numberOfLines={1}>{item.url}</Text>
                </View>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={{ padding: 16, color: '#9ca3af' }}>ยังไม่มีเพลงที่กดหัวใจ</Text>}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      </View>

      {/* Overlay + slide-out panel */}
      {panelOpen && (
        <>
          <Pressable style={StyleSheet.absoluteFill} onPress={closePanel}>
            <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
          </Pressable>

          <Animated.View style={[styles.panel, { width: PANEL_WIDTH, transform: [{ translateX: slideX }] }]}>
            <Text style={styles.panelTitle}>Menu</Text>

            <MenuItem title={editing ? 'ยกเลิกแก้ไขโปรไฟล์' : 'แก้ไขโปรไฟล์'} onPress={() => { setEditing((p) => !p); closePanel(); }} />
            <MenuItem title="แก้ไขรหัสผ่าน" onPress={() => { closePanel(); navigation.navigate('ForgetPassword'); }} />
            {isJed && <MenuItem title="Songs Global (admin)" onPress={() => { closePanel(); navigation.navigate('SongsGlobal'); }} />}

            <View style={styles.panelDivider} />

            <MenuItem title="ออกจากระบบ" danger onPress={() => {
              closePanel();
              Alert.alert('ออกจากระบบ', 'ต้องการออกจากระบบใช่ไหม?', [
                { text: 'ยกเลิก', style: 'cancel' },
                { text: 'ออกจากระบบ', style: 'destructive', onPress: handleLogout },
              ]);
            }} />
          </Animated.View>
        </>
      )}

      {/* Bottom tabs */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.tabBtn} onPress={goHome}>
          <Text style={styles.tabText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, styles.tabActive]}>
          <Text style={[styles.tabText, styles.tabTextActive]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 82;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#eef2f7' },
  topCard: {
    backgroundColor: 'white', marginHorizontal: 16, marginTop: 8, borderRadius: 18,
    paddingTop: AVATAR_SIZE / 2 + 10, paddingBottom: 18, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 4,
  },
  avatarWrapper: {
    position: 'absolute', top: -AVATAR_SIZE / 2, left: '50%', marginLeft: -AVATAR_SIZE / 2,
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, borderWidth: 3, borderColor: 'white', overflow: 'hidden',
  },
  avatar: { width: '100%', height: '100%' },

  name: { fontSize: 18, fontWeight: '700', color: '#111', marginTop: 6 },
  premiumBadge: { color: '#fde610ff', fontWeight: '800' },
  subText: { color: '#af9e9cff', marginTop: 2, fontSize: 13 },

  editBtn: { marginTop: 10, backgroundColor: '#111827', paddingHorizontal: 18, paddingVertical: 6, borderRadius: 999 },
  editBtnText: { color: 'white', fontWeight: '600' },

  statsRow: { flexDirection: 'row', marginTop: 14, gap: 16 },
  statBox: { alignItems: 'center', minWidth: 70 },
  statNumber: { fontSize: 20, fontWeight: '700', color: '#111' },
  statLabel: { fontSize: 12, color: '#9ca3af', marginTop: 2 },

  sectionTitleWrap: { marginTop: 20, marginHorizontal: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  listCard: { backgroundColor: 'white', marginHorizontal: 16, marginTop: 10, borderRadius: 14, overflow: 'hidden' },
  listItem: {
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f1f1',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  listItemTitle: { fontSize: 15, fontWeight: '600', color: '#111' },
  listItemSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  chevron: { fontSize: 22, color: '#cbd5f5' },

  input: { borderWidth: 1, borderColor: '#dcdcdc', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10, backgroundColor: '#fff' },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  panel: {
    position: 'absolute', right: 0, top: 0, bottom: 0, backgroundColor: 'white',
    paddingTop: 14, paddingHorizontal: 16, elevation: 16,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: -4, height: 0 },
  },
  panelTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  panelDivider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  menuItem: { paddingVertical: 12 },
  menuText: { fontSize: 15, color: '#111' },

  bottomBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    height: 64, backgroundColor: '#0a0a0a', flexDirection: 'row',
    borderTopWidth: 0, alignItems: 'center', justifyContent: 'space-around',
  },
  tabBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  tabActive: { backgroundColor: '#111827' },
  tabText: { color: 'gray', fontWeight: '700' },
  tabTextActive: { color: 'white' },
});
