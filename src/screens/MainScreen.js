// src/screens/MainScreen.js
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, Dimensions, StyleSheet, Image, Pressable,
  StatusBar, Animated, SafeAreaView, Alert, Modal
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Audio } from 'expo-av';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from 'react-native-paper';

// Firebase
import { auth, db } from '../firebase/config';
import {
  collection, onSnapshot, query, orderBy, doc, setDoc, deleteDoc, serverTimestamp, getDoc, updateDoc
} from 'firebase/firestore';

// Event bus
import { emit, on } from '../utils/eventBus';

const { height } = Dimensions.get('window');

// ---- ตั้งค่า paywall ----
const FREE_PREVIEW_MS = 15_000;
// ถ้ามี URL โฮสต์ภาพ QR ให้ใส่ลงไปแทน null
const QR_REMOTE_URL = null;
// ใช้รูปโลคัล (วางไฟล์ที่ src/assets/qrcode.jpg)
const QR_SOURCE = QR_REMOTE_URL
  ? { uri: QR_REMOTE_URL }
  : require('../../assets/qrcode.jpg');

export default function MainScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // premium state (ดึงจาก users/{uid}.premium)
  const [isPremium, setIsPremium] = useState(false);
  const [isLocked, setIsLocked] = useState(false);       // ล็อกไม่ให้เล่นจนกว่าจะจ่าย
  const [paywallOpen, setPaywallOpen] = useState(false); // โชว์ QR overlay

  // subscribe premium flag
  useEffect(() => {
    if (!user?.uid) { setIsPremium(false); return; }
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      const d = snap.data() || {};
      const premium = !!d.premium;
      setIsPremium(premium);
      if (premium) {
        setIsLocked(false);
        setPaywallOpen(false);
      }
    });
    return () => unsub && unsub();
  }, [user?.uid]);

  // เมื่อออกจาก Main → หยุดเพลงทั้งหมด
  useFocusEffect(
    React.useCallback(() => {
      return () => emit('STOP_AUDIO');
    }, [])
  );

  // ฟังสัญญาณจาก player ว่าต้องให้จ่ายเงิน
  useEffect(() => {
    const offRequire = on('REQUIRE_PREMIUM', () => {
      if (!isPremium) {
        setIsLocked(true);
        setPaywallOpen(true);
        emit('STOP_AUDIO');
      }
    });
    // จ่ายเงินสำเร็จ (มาจาก SlipCheckScreen)
    const offUpgraded = on('PREMIUM_UPGRADED', () => {
      setIsPremium(true);
      setIsLocked(false);
      setPaywallOpen(false);
      // ไม่ auto-play เพื่อไม่ให้เสียงเด้งโดยไม่ตั้งใจ
    });
    return () => { offRequire && offRequire(); offUpgraded && offUpgraded(); };
  }, [isPremium]);

  const goProfile = () => {
    emit('STOP_AUDIO');
    navigation.navigate('ProfileScreen');
  };

  const goSearch = () => {
    emit('STOP_AUDIO');
    navigation.navigate('SearchScreen');
  };

  const confirmPayment = () => {
    // ไปตรวจสลิป
    navigation.navigate('SlipCheck');
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <StatusBar barStyle="light-content" />

      {/* ไอคอนค้นหา มุมขวาบน */}
      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
        <View style={{ flex: 1 }} />
        <IconButton
          icon="magnify"
          size={45}
          iconColor="#fff"
          onPress={goSearch}
          style={{ marginRight: 6 }}
        />
      </View>

      {/* ฟีดเพลง */}
      <SongFeedScreen
        currentUser={user}
        isPremium={isPremium}
        isLocked={isLocked}
      />

      {/* Paywall Modal (บังคับให้จ่าย) */}
      <Modal
        visible={paywallOpen}
        animationType="fade"
        transparent
        onRequestClose={() => {}}
      >
        <View style={styles.paywallBackdrop}>
          <View style={styles.paywallBox}>
            <Text style={styles.paywallTitle}>ปลดล็อกฟังเพลงเต็มตลอดชีพ</Text>
            <Text style={styles.paywallText}>
              ตอนนี้คุณสามารถฟังได้ฟรี {FREE_PREVIEW_MS / 1000} วินาทีต่อเพลง
              หากต้องการฟังเต็มทุกเพลงและตลอดชีพ โปรดสแกนชำระเงินครั้งเดียว
            </Text>
            <Image source={QR_SOURCE} style={styles.qr} />
            <Pressable style={styles.payBtn} onPress={confirmPayment}>
              <Text style={styles.payBtnText}>ยืนยันการชำระเงิน / ตรวจสลิป</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* แถบล่าง (Home / Profile) */}
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

/** ----------------- Feed ----------------- */
function SongFeedScreen({ currentUser, isPremium, isLocked }) {
  const [songs, setSongs] = useState([]);
  const [likedIds, setLikedIds] = useState(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);

  const listRef = useRef(null);

  // READ: songs
  useEffect(() => {
    const q = query(collection(db, 'songs'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => {
        const x = d.data() || {};
        return {
          id: d.id,
          title: x.name || 'Untitled',
          artist: x.artist || '',
          audioUrl: x.url || '',
          cover: x.logo || '',
        };
      });
      setSongs(list);
    });
    return () => unsub();
  }, []);

  // READ: likes of current user
  useEffect(() => {
    if (!currentUser?.uid) return;
    const likesCol = collection(db, 'users', currentUser.uid, 'likes');
    const unsub = onSnapshot(likesCol, (snap) => {
      const s = new Set(snap.docs.map((d) => d.id));
      setLikedIds(s);
    });
    return () => unsub && unsub();
  }, [currentUser?.uid]);

  // toggle like
  const toggleLike = async (song) => {
    if (!currentUser?.uid) {
      Alert.alert('ยังไม่ได้ล็อกอิน', 'กรุณาเข้าสู่ระบบก่อนกดหัวใจ');
      return;
    }
    try {
      const ref = doc(db, 'users', currentUser.uid, 'likes', song.id);
      if (likedIds.has(song.id)) {
        await deleteDoc(ref);
      } else {
        await setDoc(ref, {
          songId: song.id,
          name: song.title,
          artist: song.artist,
          url: song.audioUrl,
          logo: song.cover || '',
          createdAt: serverTimestamp(),
        });
      }
    } catch (e) {
      Alert.alert('ผิดพลาด', String(e?.message || e));
    }
  };

  const viewabilityConfig = { viewAreaCoveragePercentThreshold: 80 };
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index);
  }).current;

  return (
    <View style={{ flex: 1, paddingBottom: 64 }}>
      <FlatList
        ref={listRef}
        data={songs}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <SongFeedItem
            item={item}
            isActive={index === currentIndex}
            isLiked={likedIds.has(item.id)}
            onToggleLike={() => toggleLike(item)}
            isPremium={isPremium}
            isLocked={isLocked}
          />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        snapToAlignment="start"
        decelerationRate="fast"
        getItemLayout={(_, i) => ({ length: height, offset: height * i, index: i })}
        ListEmptyComponent={
          <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: 'white' }}>ยังไม่มีเพลงในระบบ</Text>
          </SafeAreaView>
        }
      />
    </View>
  );
}

/** ----------------- Song item (preview 15 วิ) ----------------- */
function SongFeedItem({ item, isActive, isLiked, onToggleLike, isPremium, isLocked }) {
  const soundRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const wasPlayingBeforeSlide = useRef(false);

  const gatedRef = useRef(false); // กันเรียกซ้ำเมื่อครบ 15 วิ

  // 🌀 หมุนปก
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const spinAnimationRef = useRef(null);

  // audio mode
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});
  }, []);

  // LOAD
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: item.audioUrl },
          { shouldPlay: false }
        );
        if (!mounted) return;
        soundRef.current = sound;
        setIsLoaded(true);
        gatedRef.current = false; // reset gate เมื่อโหลดเพลงใหม่
        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) return;
          setPositionMillis(status.positionMillis || 0);
          setDurationMillis(status.durationMillis || 1);

          // ถ้าไม่พรีเมียม → ครบ 15 วิ ให้หยุด + โชว์ paywall
          if (!isPremium && !gatedRef.current) {
            const pos = status.positionMillis || 0;
            if (pos >= FREE_PREVIEW_MS) {
              gatedRef.current = true;
              try { sound.pauseAsync(); } catch (e) {}
              setIsPlaying(false);
              stopSpinning();
              emit('REQUIRE_PREMIUM');
            }
          }

          // วนเล่นเฉพาะคนพรีเมียม
          if (isPremium && status.didJustFinish) {
            sound.replayAsync();
          }
        });
      } catch (e) {}
    };
    load();
    return () => {
      mounted = false;
      if (soundRef.current) soundRef.current.unloadAsync();
      stopSpinning();
    };
  }, [item.audioUrl, isPremium]);

  // คุมเล่น/หยุดตามการมองเห็น
  useEffect(() => {
    const run = async () => {
      if (!isLoaded || !soundRef.current) return;
      try {
        if (isActive && !isLocked) {
          // ถ้าล็อกไว้ (ไม่จ่าย) ไม่ให้เล่น
          if (!isPremium && gatedRef.current) {
            emit('REQUIRE_PREMIUM');
            return;
          }
          await soundRef.current.playAsync();
          setIsPlaying(true);
          startSpinning();
        } else {
          await soundRef.current.pauseAsync();
          setIsPlaying(false);
          stopSpinning();
        }
      } catch (e) {}
    };
    run();
  }, [isActive, isLoaded, isLocked, isPremium]);

  // หยุดเพลงเมื่อออกจาก Main
  useEffect(() => {
    const off = on('STOP_AUDIO', async () => {
      try {
        if (soundRef.current) {
          const st = await soundRef.current.getStatusAsync();
          if (st.isLoaded && st.isPlaying) {
            await soundRef.current.pauseAsync();
            setIsPlaying(false);
            stopSpinning();
          }
        }
      } catch {}
    });
    return off;
  }, []);

  // แตะเพื่อ toggle play/pause
  const handleTap = async () => {
    if (!soundRef.current) return;

    // ถ้ายังไม่จ่ายและโดน gate แล้ว → บังคับ paywall
    if (!isPremium && (isLocked || gatedRef.current)) {
      emit('REQUIRE_PREMIUM');
      return;
    }

    const status = await soundRef.current.getStatusAsync();
    if (status.isPlaying) {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
      stopSpinning();
    } else {
      await soundRef.current.playAsync();
      setIsPlaying(true);
      startSpinning();
    }
  };

  // Slider
  const onSlidingStart = async () => {
    if (!soundRef.current) return;
    const status = await soundRef.current.getStatusAsync();
    wasPlayingBeforeSlide.current = status.isPlaying;
    if (status.isPlaying) {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
      stopSpinning();
    }
  };
  const onSlidingComplete = async (valSec) => {
    if (!soundRef.current) return;
    try {
      await soundRef.current.setPositionAsync(valSec * 1000);

      // ถ้าขยับข้าม 15 วิในโหมดฟรี → gate ทันที
      if (!isPremium && valSec * 1000 >= FREE_PREVIEW_MS) {
        gatedRef.current = true;
        emit('REQUIRE_PREMIUM');
        return;
      }

      if (wasPlayingBeforeSlide.current) {
        await soundRef.current.playAsync();
        setIsPlaying(true);
        startSpinning();
      }
    } catch (e) {}
  };

  // แอนิเมชันหมุน
  const startSpinning = () => {
    rotateAnim.setValue(0);
    spinAnimationRef.current = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 6000,
        useNativeDriver: true,
        easing: (t) => t,
      })
    );
    spinAnimationRef.current.start();
  };
  const stopSpinning = () => {
    if (spinAnimationRef.current) {
      spinAnimationRef.current.stop();
      spinAnimationRef.current = null;
    }
  };

  const formatTime = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' + s : s}`;
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const currentSec = positionMillis / 1000;
  const totalSec = durationMillis / 1000;

  return (
    <Pressable style={styles.page} onPress={handleTap}>
      {!!item.cover && (
        <Image source={{ uri: item.cover }} style={StyleSheet.absoluteFill} blurRadius={25} />
      )}
      <View style={styles.overlay} />

      <View style={styles.center}>
        <Animated.Image
          source={{ uri: item.cover || 'https://i.imgur.com/7QdY7Yp.png' }}
          style={[styles.cover, { transform: [{ rotate: spin }] }]}
        />
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

        {!isPremium && (
          <Text style={styles.previewBadge}>
            Free preview {FREE_PREVIEW_MS / 1000}s
          </Text>
        )}
      </View>

      <Pressable style={styles.heartBox} onPress={onToggleLike}>
        <Text style={[styles.heart, isLiked && { color: 'red' }]}>{isLiked ? '♥' : '♡'}</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // player page
  page: { height, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
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

  // badge
  previewBadge: {
    color: '#FFD700',
    textAlign: 'center',
    marginTop: 6,
    fontSize: 12,
    opacity: 0.9,
  },

  // top bar
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: -15,
    height: -48,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    zIndex: 10,
    backgroundColor: 'transparent',
  },

  // paywall
  paywallBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center', alignItems: 'center', padding: 16,
  },
  paywallBox: {
    backgroundColor: 'white', borderRadius: 16, padding: 16, width: '100%', maxWidth: 380,
    alignItems: 'center',
  },
  paywallTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6, color: '#111' },
  paywallText: { color: '#4b5563', textAlign: 'center', marginBottom: 12 },
  qr: { width: 260, height: 360, resizeMode: 'contain', borderRadius: 12, backgroundColor: '#fff', marginBottom: 12 },
  payBtn: { backgroundColor: '#111827', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  payBtnText: { color: '#fff', fontWeight: '700' },

  // bottom bar
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
