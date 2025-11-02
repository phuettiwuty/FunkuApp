// ProfileScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  TouchableOpacity,
} from 'react-native';

export default function ProfileScreen() {
  // สมมุติข้อมูลก่อน
  const username = 'tumproject';
  const likedCount = 12;
  const playlistCount = 3;
  const followingCount = 8;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity>
          <Text style={styles.headerAction}>⋯</Text>
        </TouchableOpacity>
      </View>

      {/* Card บน */}
      <View style={styles.topCard}>
        {/* รูปโปรไฟล์วางทับ */}
        <View style={styles.avatarWrapper}>
          <Image
            source={{
              uri: 'https://scontent.fbkk23-1.fna.fbcdn.net/v/t39.30808-6/530964832_4061329837449304_2012700132486234005_n.jpg?stp=cp6_dst-jpg_tt6&_nc_cat=104&ccb=1-7&_nc_sid=6ee11a&_nc_ohc=jN7WK-I_OawQ7kNvwHnLY3g&_nc_oc=Adm-4D31Kdvx42zOZ7AzMxZVsG8GncRA-D6zjJLYPEz-uZm2RXPkIR22gvqou5AIgmI&_nc_zt=23&_nc_ht=scontent.fbkk23-1.fna&_nc_gid=sXZU3RQScdUJ9bQJeL34sw&oh=00_AfgOvHTQ6KiwOs0hQ79_5HrddCCgicQy85K5m3wQcZHRVQ&oe=690D2F41',
            }}
            style={styles.avatar}
          />
        </View>

        <Text style={styles.name}>{username}</Text>
        <Text style={styles.subText}>Music lover • Feed user</Text>

        <TouchableOpacity style={styles.editBtn}>
          <Text style={styles.editBtnText}>Edit profile</Text>
        </TouchableOpacity>

        {/* สถิติ */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{likedCount}</Text>
            <Text style={styles.statLabel}>Liked</Text>
          </View>
          
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{followingCount}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>
      </View>

      {/* การ์ดล่าง */}
      <View style={styles.sectionTitleWrap}>
        <Text style={styles.sectionTitle}>Your activity</Text>
      </View>

      <View style={styles.listCard}>
        <TouchableOpacity style={styles.listItem}>
          <View>
            <Text style={styles.listItemTitle}>❤️ Songs you liked</Text>
            <Text style={styles.listItemSub}>เพลงที่ถูกใจกดหัวใจไว้</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{likedCount}</Text>
          </View>
        </TouchableOpacity>   
      </View>
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 82;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef2f7',
  },
  header: {
    height: 54,
    backgroundColor: '#eef2f7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
  },
  headerAction: {
    fontSize: 26,
    color: '#555',
  },
  topCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    paddingTop: AVATAR_SIZE / 2 + 10, // เว้นให้รูป
    paddingBottom: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  avatarWrapper: {
    position: 'absolute',
    top: -AVATAR_SIZE / 2,
    left: '50%',
    marginLeft: -AVATAR_SIZE / 2,
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    borderColor: 'white',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginTop: 6,
  },
  subText: {
    color: '#9ca3af',
    marginTop: 2,
    fontSize: 13,
  },
  editBtn: {
    marginTop: 10,
    backgroundColor: '#111827',
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 999,
  },
  editBtnText: {
    color: 'white',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 16,
  },
  statBox: {
    alignItems: 'center',
    minWidth: 70,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  sectionTitleWrap: {
    marginTop: 20,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  listCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
  },
  listItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  listItemSub: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#f43f5e',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    color: 'white',
    fontWeight: '700',
  },
  chevron: {
    fontSize: 22,
    color: '#cbd5f5',
  },
});
