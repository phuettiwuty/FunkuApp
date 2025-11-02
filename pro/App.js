// App.js
import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Dimensions,
  StyleSheet,
  Image,
  Pressable,
  StatusBar,
  Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';

const { height } = Dimensions.get('window');

// -------------------- SONG DATA --------------------
const FEED_SONGS = [
  {
    id: '1',
    title: 'ความรักทำให้คนตาบอด',
    artist: 'bodyslam',
    audioUrl:
      'https://vertical-indigo-osnzjjzsvh.edgeone.app/%E0%B8%84%E0%B8%A7%E0%B8%B2%E0%B8%A1%E0%B8%A3%E0%B8%81%E0%B8%97%E0%B8%B3%E0%B9%83%E0%B8%AB%E0%B8%84%E0%B8%99%E0%B8%95%E0%B8%B2%E0%B8%9A%E0%B8%AD%E0%B8%94%20-%20bodyslamOFFICIAL%20MV.mp3',
    cover: 'https://musicstation.kapook.com/files_music2008/picture/0/3057.jpg',
  },
  {
    id: '2',
    title: 'MINISKIRT',
    artist: 'AOA',
    audioUrl:
      'https://drive.google.com/uc?export=download&id=1z2HX_DXH9gGtsUqW0j01-FTdbcNqo8JZ',
    cover: 'https://f.ptcdn.info/211/048/000/oisseoj8jW4SOoBeGWN-o.jpg',
  },
  {
    id: '3',
    title: 'จำทำไม',
    artist: 'ศักศรี',
    audioUrl:
      'https://isolated-red-hs1rq5h0fu.edgeone.app/%E0%B8%88%E0%B8%B3%E0%B8%97%E0%B8%B3%E0%B9%84%E0%B8%A1.mp3',
    cover: 'https://s.isanook.com/jo/0/ud/489/2449389/tattoocolour.jpg?ip/crop/w670h402/q80/jpg',
  },
  {
    id: '4',
    title: 'ที่หนึ่งที่คูเมือง',
    artist: 'ILLSLICK',
    audioUrl:
      'https://regular-ivory-quipo7itay.edgeone.app/ILLSLICK.mp3',
    cover: 'https://thethaiger.com/th/wp-content/uploads/2025/04/snapins-ai_3615016547917506199-1.jpg',
  },
];

export default function App() {
  const [currentIndex, setCurrentIndex] = useState(0);

  // ให้เล่นใน silent ได้
  useEffect(() => {
    (async () => {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    })();
  }, []);

  const viewabilityConfig = { viewAreaCoveragePercentThreshold: 80 };
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <StatusBar barStyle="light-content" />
      <FlatList
        data={FEED_SONGS}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <SongFeedItem item={item} isActive={index === currentIndex} />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        snapToAlignment="start"
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          length: height,
          offset: height * index,
          index,
        })}
      />
    </View>
  );
}

// ================ SONG ITEM ================
function SongFeedItem({ item, isActive }) {
  const soundRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(1);
  const [liked, setLiked] = useState(false);
  const wasPlayingBeforeSlide = useRef(false);

  // 🌀 สำหรับหมุน
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const spinAnimationRef = useRef(null);

  // โหลดเพลง
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

        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) return;
          setPositionMillis(status.positionMillis || 0);
          setDurationMillis(status.durationMillis || 1);
          if (status.didJustFinish) {
            // เล่นวน
            sound.replayAsync();
          }
        });
      } catch (e) {
        console.log('load error', e);
      }
    };
    load();

    return () => {
      mounted = false;
      if (soundRef.current) soundRef.current.unloadAsync();
      stopSpinning();
    };
  }, [item.audioUrl]);

  // คุมเล่น/หยุดตามการมองเห็น
  useEffect(() => {
    const run = async () => {
      if (!isLoaded || !soundRef.current) return;
      try {
        if (isActive) {
          await soundRef.current.playAsync();
          setIsPlaying(true);
          startSpinning();
        } else {
          await soundRef.current.pauseAsync();
          setIsPlaying(false);
          stopSpinning();
        }
      } catch (e) {
        console.log(e);
      }
    };
    run();
  }, [isActive, isLoaded]);

  // ฟังก์ชันหมุน
  const startSpinning = () => {
    // รีเซ็ตก่อน
    rotateAnim.setValue(0);
    spinAnimationRef.current = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 6000, // 6 วิ ต่อรอบ
        useNativeDriver: true,
        easing: t => t,
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

  // แตะจอ toggle เล่น/หยุด
  const handleTap = async () => {
    if (!soundRef.current) return;
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

  // slider
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

  const onSlidingComplete = async (valueSec) => {
    if (!soundRef.current) return;
    try {
      await soundRef.current.setPositionAsync(valueSec * 1000);
      if (wasPlayingBeforeSlide.current) {
        await soundRef.current.playAsync();
        setIsPlaying(true);
        startSpinning();
      }
    } catch (e) {
      console.log('seek error', e);
    }
  };

  // เวลา
  const formatTime = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' + s : s}`;
  };

  const currentSec = positionMillis / 1000;
  const totalSec = durationMillis / 1000;

  // แปลงค่าเป็นองศา
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Pressable style={styles.page} onPress={handleTap}>
      {/* BG เบลอ */}
      <Image source={{ uri: item.cover }} style={StyleSheet.absoluteFill} blurRadius={25} />
      <View style={styles.overlay} />

      {/* ปกเพลงตรงกลาง (หมุนได้) */}
      <View style={styles.center}>
        <Animated.Image
          source={{ uri: item.cover }}
          style={[
            styles.cover,
            { transform: [{ rotate: spin }] },
          ]}
        />
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.artist}>{item.artist}</Text>
      </View>

      {/* Slider + เวลา */}
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
      </View>

      {/* ปุ่มหัวใจ */}
      <Pressable style={styles.heartBox} onPress={() => setLiked((p) => !p)}>
        <Text style={[styles.heart, liked && { color: 'red' }]}>{liked ? '♥' : '♡'}</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    height,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  center: {
    alignItems: 'center',
  },
  cover: {
    width: 220,
    height: 220,
    borderRadius: 110, // ให้เหมือนแผ่น
    marginBottom: 24,
    borderWidth: 5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  artist: {
    color: 'white',
    opacity: 0.7,
    marginBottom: 40,
  },
  sliderBox: {
    position: 'absolute',
    bottom: 100,
    left: 32,
    right: 32,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeText: {
    color: 'white',
    fontSize: 12,
  },
  heartBox: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
  },
  heart: {
    color: 'white',
    fontSize: 36,
  },
});
