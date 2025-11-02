// src/screens/MainScreen.js
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, Image, Pressable,
  StatusBar, Animated, Alert, Modal
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Audio } from 'expo-av';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from 'react-native-paper';

import { db } from '../firebase/config';
import {
  collection, onSnapshot, query, orderBy, doc, setDoc, deleteDoc,
  serverTimestamp
} from 'firebase/firestore';

import { emit, on } from '../utils/eventBus';

const FREE_PREVIEW_MS = 15_000;
const BOTTOM_BAR_HEIGHT = 64;
const QR_SOURCE = require('../../assets/qrcode.jpg');

export default function MainScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [isPremium, setIsPremium] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  // premium realtime
  useEffect(() => {
    if (!user?.uid) { setIsPremium(false); return; }
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      const d = snap.data() || {};
      const premium = !!d.premium;
      setIsPremium(premium);
      if (premium) { setIsLocked(false); setPaywallOpen(false); }
    });
    return () => unsub && unsub();
  }, [user?.uid]);

  // ออกจากหน้า Main → หยุดเสียงทุกตัว
  useFocusEffect(React.useCallback(() => () => emit('STOP_AUDIO'), []));

  // สื่อสารกับ paywall
  useEffect(() => {
    const offRequire = on('REQUIRE_PREMIUM', () => {
      if (!isPremium) { setIsLocked(true); setPaywallOpen(true); emit('STOP_AUDIO'); }
    });
    const offUpgraded = on('PREMIUM_UPGRADED', () => {
      setIsPremium(true); setIsLocked(false); setPaywallOpen(false);
    });
    return () => { offRequire && offRequire(); offUpgraded && offUpgraded(); };
  }, [isPremium]);

  // ใช้ replace กัน stack ซ้อน + หยุดเสียงก่อนสลับหน้า
  const goProfile = () => { emit('STOP_AUDIO'); navigation.replace('ProfileScreen'); };
  const goSearch  = () => { emit('STOP_AUDIO'); navigation.navigate('SearchScreen'); };
  const confirmPayment = () => navigation.navigate('SlipCheck');

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <StatusBar barStyle="light-content" />

      {/* ปุ่มค้นหา (ลอยด้านบน) */}
      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
        <View style={{ flex: 1 }} />
        <IconButton icon="magnify" size={22} iconColor="#fff" onPress={goSearch} style={{ marginRight: 6 }} />
      </View>

      <SongFeedScreen currentUser={user} isPremium={isPremium} isLocked={isLocked} />

      {/* Paywall */}
      <Modal visible={paywallOpen} animationType="fade" transparent onRequestClose={() => setPaywallOpen(false)}>
        <Pressable style={styles.paywallBackdrop} onPress={() => setPaywallOpen(false)}>
          <Pressable style={styles.paywallBox} onPress={() => {}}>
            <Pressable style={styles.closeBtn} onPress={() => setPaywallOpen(false)} hitSlop={10}>
              <Text style={styles.closeTxt}>×</Text>
            </Pressable>
            <Text style={styles.paywallTitle}>ปลดล็อกฟังเพลงเต็มตลอดชีพ</Text>
            <Text style={styles.paywallText}>
              ตอนนี้คุณฟังฟรี {FREE_PREVIEW_MS / 1000} วินาทีต่อเพลง
              หากต้องการฟังเต็มทุกเพลงและตลอดชีพ โปรดสแกนชำระเงินครั้งเดียว
            </Text>
            <Image source={QR_SOURCE} style={styles.qr} />
            <Pressable style={styles.payBtn} onPress={confirmPayment}>
              <Text style={styles.payBtnText}>ยืนยันการชำระเงิน / ตรวจสลิป</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* แถบล่าง */}
      <View style={styles.bottomBar}>
        <Pressable style={[styles.tabBtn, styles.tabActive]} onPress={() => {}}>
          <Text style={[styles.tabText, styles.tabTextActive]}>Home</Text>
        </Pressable>
        <Pressable style={styles.tabBtn} onPress={goProfile}>
          <Text style={styles.tabText}>Profile</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* -------------------- Feed (แก้ iOS กินจอ) -------------------- */
function SongFeedScreen({ currentUser, isPremium, isLocked }) {
  const [songs, setSongs] = useState([]);
  const [likedIds, setLikedIds] = useState(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);

  const listRef = useRef(null);
  const pendingSongIdRef = useRef(null);
  const jumpTargetIndexRef = useRef(null);
  const autoplayNextActivationRef = useRef(true);

  // วัดความสูง viewport จริงของพื้นที่แสดงผล (หักแท็บล่างด้วย marginBottom)
  const [viewportH, setViewportH] = useState(0);
  const onContainerLayout = (e) => {
    const h = Math.round(e.nativeEvent.layout.height);
    if (h && h !== viewportH) setViewportH(h);
  };

  // ถ้ายังวัดไม่ได้ ให้ fallback เป็นความสูงหน้าจอ
  const { height: screenH } = require('react-native').Dimensions.get('window');
  const ITEM_HEIGHT = viewportH || Math.round(screenH - BOTTOM_BAR_HEIGHT);

  // songs realtime
  useEffect(() => {
    const q = query(collection(db, 'songs'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => {
        const x = d.data() || {};
        return { id: d.id, title: x.name || 'Untitled', artist: x.artist || '', audioUrl: x.url || '', cover: x.logo || '' };
      });
      setSongs(list);
    });
    return () => unsub();
  }, []);

  // likes realtime
  useEffect(() => {
    if (!currentUser?.uid) return;
    const likesCol = collection(db, 'users', currentUser.uid, 'likes');
    const unsub = onSnapshot(likesCol, (snap) => {
      setLikedIds(new Set(snap.docs.map((d) => d.id)));
    });
    return () => unsub && unsub();
  }, [currentUser?.uid]);

  // toggle like
  const toggleLike = async (song) => {
    if (!currentUser?.uid) return Alert.alert('ยังไม่ได้ล็อกอิน', 'กรุณาเข้าสู่ระบบก่อนกดหัวใจ');
    try {
      const ref = doc(db, 'users', currentUser.uid, 'likes', song.id);
      if (likedIds.has(song.id)) await deleteDoc(ref);
      else await setDoc(ref, { songId: song.id, name: song.title, artist: song.artist, url: song.audioUrl, logo: song.cover || '', createdAt: serverTimestamp() });
    } catch (e) { Alert.alert('ผิดพลาด', String(e?.message || e)); }
  };

  // รับสัญญาณ JUMP (จาก Search ผ่าน Main)
  useEffect(() => {
    const off = on('JUMP_TO_SONG', (payload) => {
      const { songId, autoplay } = typeof payload === 'object' ? payload : { songId: payload, autoplay: true };
      pendingSongIdRef.current = songId;
      autoplayNextActivationRef.current = !!autoplay; // false = ไม่เล่นอัตโนมัติครั้งแรก
      const idx = songs.findIndex((s) => s.id === songId);
      if (idx >= 0) { jumpTargetIndexRef.current = idx; scrollToTarget(idx); }
    });
    return off;
  }, [songs]);

  // รายการเพิ่งโหลด แล้วยังมี target
  useEffect(() => {
    if (!pendingSongIdRef.current || songs.length === 0) return;
    const idx = songs.findIndex((s) => s.id === pendingSongIdRef.current);
    if (idx >= 0) { jumpTargetIndexRef.current = idx; scrollToTarget(idx); }
  }, [songs]);

  const scrollToTarget = (idx) => {
    try { listRef.current?.scrollToIndex({ index: idx, animated: true }); }
    catch { setTimeout(() => { try { listRef.current?.scrollToIndex({ index: idx, animated: true }); } catch {} }, 50); }
  };

  const viewabilityConfig = { viewAreaCoveragePercentThreshold: 80 };
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const idx = viewableItems[0].index;
      setCurrentIndex(idx);
      if (jumpTargetIndexRef.current === idx) {
        setTimeout(() => {
          jumpTargetIndexRef.current = null;
          autoplayNextActivationRef.current = true;
        }, 0);
      }
    }
  }).current;

  return (
    // marginBottom = กันถูกแท็บล่างทับ + ทำให้ onLayout วัด “viewport จริง”
    <View style={{ flex: 1, marginBottom: BOTTOM_BAR_HEIGHT }} onLayout={onContainerLayout}>
      <FlatList
        ref={listRef}
        data={songs}
        keyExtractor={(item) => item.id}
        // ✅ ใช้เฉพาะ snapToInterval ให้เท่ากับความสูง viewport
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="start"
        disableIntervalMomentum
        decelerationRate="fast"
        // layout item ต้องเท่ากับ snapToInterval เป๊ะ
        getItemLayout={(_, i) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * i, index: i })}
        // ถ้าความสูงเปลี่ยน ให้บังคับรีเรนเดอร์ใหม่
        key={`feed-${ITEM_HEIGHT}`}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item, index }) => (
          <SongFeedItem
            item={item}
            isActive={index === currentIndex}
            isLiked={likedIds.has(item.id)}
            onToggleLike={() => toggleLike(item)}
            isPremium={isPremium}
            isLocked={isLocked}
            itemHeight={ITEM_HEIGHT}
            allowAutoplay={
              jumpTargetIndexRef.current === index ? autoplayNextActivationRef.current : true
            }
          />
        )}
      />
    </View>
  );
}

/* -------------------- Item (player) -------------------- */
function SongFeedItem({ item, isActive, isLiked, onToggleLike, isPremium, isLocked, itemHeight, allowAutoplay }) {
  const soundRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const wasPlayingBeforeSlide = useRef(false);
  const gatedRef = useRef(false);

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const spinAnimationRef = useRef(null);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true, allowsRecordingIOS: false, staysActiveInBackground: false,
      shouldDuckAndroid: true, playThroughEarpieceAndroid: false,
    }).catch(() => {});
  }, []);

  // load/unload เสียงต่อเพลง
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync({ uri: item.audioUrl }, { shouldPlay: false });
        if (!mounted) return;
        soundRef.current = sound; setIsLoaded(true); gatedRef.current = false;
        sound.setOnPlaybackStatusUpdate((st) => {
          if (!st.isLoaded) return;
          setPositionMillis(st.positionMillis || 0);
          setDurationMillis(st.durationMillis || 1);
          if (!isPremium && !gatedRef.current && (st.positionMillis || 0) >= FREE_PREVIEW_MS) {
            gatedRef.current = true; try { sound.pauseAsync(); } catch {}
            setIsPlaying(false); stopSpinning(); emit('REQUIRE_PREMIUM');
          }
          if (isPremium && st.didJustFinish) { sound.replayAsync(); }
        });
      } catch {}
    };
    load();
    return () => { mounted = false; if (soundRef.current) soundRef.current.unloadAsync(); stopSpinning(); };
  }, [item.audioUrl, isPremium]);

  // เล่น/หยุดตามการมองเห็น + สถานะล็อก + allowAutoplay
  useEffect(() => {
    const run = async () => {
      if (!isLoaded || !soundRef.current) return;
      try {
        if (isActive && !isLocked) {
          if (!isPremium && gatedRef.current) { emit('REQUIRE_PREMIUM'); return; }
          if (allowAutoplay) { await soundRef.current.playAsync(); setIsPlaying(true); startSpinning(); }
          else { await soundRef.current.pauseAsync(); setIsPlaying(false); stopSpinning(); }
        } else {
          await soundRef.current.pauseAsync(); setIsPlaying(false); stopSpinning();
        }
      } catch {}
    };
    run();
  }, [isActive, isLoaded, isLocked, isPremium, allowAutoplay]);

  // หยุดเพลงเมื่อออกจาก Main
  useEffect(() => {
    const off = on('STOP_AUDIO', async () => {
      try {
        if (soundRef.current) {
          const st = await soundRef.current.getStatusAsync();
          if (st.isLoaded && st.isPlaying) { await soundRef.current.pauseAsync(); setIsPlaying(false); stopSpinning(); }
        }
      } catch {}
    });
    return off;
  }, []);

  const handleTap = async () => {
    if (!soundRef.current) return;
    if (!isPremium && (isLocked || gatedRef.current)) { emit('REQUIRE_PREMIUM'); return; }
    const st = await soundRef.current.getStatusAsync();
    if (st.isPlaying) { await soundRef.current.pauseAsync(); setIsPlaying(false); stopSpinning(); }
    else { await soundRef.current.playAsync(); setIsPlaying(true); startSpinning(); }
  };

  // Slider
  const onSlidingStart = async () => {
    if (!soundRef.current) return;
    const st = await soundRef.current.getStatusAsync();
    wasPlayingBeforeSlide.current = st.isPlaying;
    if (st.isPlaying) { await soundRef.current.pauseAsync(); setIsPlaying(false); stopSpinning(); }
  };
  const onSlidingComplete = async (valSec) => {
    if (!soundRef.current) return;
    try {
      await soundRef.current.setPositionAsync(valSec * 1000);
      if (!isPremium && valSec * 1000 >= FREE_PREVIEW_MS) { gatedRef.current = true; emit('REQUIRE_PREMIUM'); return; }
      if (wasPlayingBeforeSlide.current) { await soundRef.current.playAsync(); setIsPlaying(true); startSpinning(); }
    } catch {}
  };

  // แอนิเมชันหมุน
  const startSpinning = () => {
    rotateAnim.setValue(0);
    spinAnimationRef.current = Animated.loop(Animated.timing(rotateAnim, { toValue: 1, duration: 6000, useNativeDriver: true, easing: (t) => t }));
    spinAnimationRef.current.start();
  };
  const stopSpinning = () => { if (spinAnimationRef.current) { spinAnimationRef.current.stop(); spinAnimationRef.current = null; } };

  const formatTime = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' + s : s}`;
  };

  const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const currentSec = positionMillis / 1000;
  const totalSec = durationMillis / 1000;

  return (
    // ❗ อย่าใส่ margin/padding ที่ทำให้ความสูง item ไม่เท่ากับ ITEM_HEIGHT
    <Pressable style={[styles.page, { height: itemHeight }]} onPress={handleTap}>
      {!!item.cover && (<Image source={{ uri: item.cover }} style={StyleSheet.absoluteFill} blurRadius={25} />)}
      <View style={styles.overlay} />

      <View style={styles.center}>
        <Animated.Image source={{ uri: item.cover || 'https://i.imgur.com/7QdY7Yp.png' }} style={[styles.cover, { transform: [{ rotate: spin }] }]} />
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.artist}>{item.artist}</Text>
      </View>

      <View style={styles.sliderBox}>
        <Slider
          style={{ width: '100%' }}
          minimumValue={0}
          maximumValue={totalSec}
          value={currentSec}
          minimumTrackTintColor="#FFD700"
          maximumTrackTintColor="rgba(255,255,255,0.3)"
          thumbTintColor="#fff"
          onSlidingStart={onSlidingStart}
          onSlidingComplete={onSlidingComplete}
        />
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(positionMillis)}</Text>
          <Text style={styles.timeText}>{formatTime(durationMillis)}</Text>
        </View>

        {!isPremium && <Text style={styles.previewBadge}>Free preview {FREE_PREVIEW_MS / 1000}s</Text>}
      </View>

      <Pressable style={styles.heartBox} onPress={onToggleLike}>
        <Text style={[styles.heart, isLiked && { color: 'red' }]}>{isLiked ? '♥' : '♡'}</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // player page
  page: { backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  center: { alignItems: 'center' },
  cover: {
    width: 220, height: 220, borderRadius: 110, marginBottom: 24,
    borderWidth: 5, borderColor: 'rgba(255,255,255,0.3)', backgroundColor: '#111',
  },
  title: { color: 'white', fontSize: 20, fontWeight: '700' },
  artist: { color: 'white', opacity: 0.7, marginBottom: 40 },

  sliderBox: { position: 'absolute', bottom: 200, left: 32, right: 32 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  timeText: { color: 'white', fontSize: 12 },

  heartBox: { position: 'absolute', bottom: 120, alignSelf: 'center' },
  heart: { color: 'white', fontSize: 36 },

  previewBadge: { color: '#FFD700', textAlign: 'center', marginTop: 6, fontSize: 12, opacity: 0.9 },

  // top bar (search)
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, height: -48,
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 8, zIndex: 10,
    backgroundColor: 'transparent',
  },

  // paywall
  paywallBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  paywallBox: { backgroundColor: 'white', borderRadius: 16, padding: 16, width: '100%', maxWidth: 380, alignItems: 'center' },
  closeBtn: { position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 28, lineHeight: 28, color: '#9ca3af' },
  paywallTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6, color: '#111' },
  paywallText: { color: '#4b5563', textAlign: 'center', marginBottom: 12 },
  qr: { width: 260, height: 360, resizeMode: 'contain', borderRadius: 12, backgroundColor: '#fff', marginBottom: 12 },
  payBtn: { backgroundColor: '#111827', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  payBtnText: { color: '#fff', fontWeight: '700' },

  // bottom bar
  bottomBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    height: BOTTOM_BAR_HEIGHT, backgroundColor: '#0a0a0a', flexDirection: 'row',
    borderTopWidth: 0, alignItems: 'center', justifyContent: 'space-around',
  },
  tabBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  tabActive: { backgroundColor: '#111827' },
  tabText: { color: 'gray', fontWeight: '700' },
  tabTextActive: { color: 'white' },
});
