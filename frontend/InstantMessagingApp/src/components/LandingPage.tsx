import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

const LandingPage: React.FC = () => {
  return (
    <LinearGradient
      colors={['#3b0066', '#7b2cbf', '#c77dff']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.contentContainer}>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>IM</Text>
            </View>
          </View>

          {/* Title */}
          <View style={styles.textSection}>
            <Text style={styles.mainTitle}>CONNECT INSTANTLY</Text>
            <Text style={styles.subTitle}>
              Fast, Secure & Seamless Messaging for Everyone
            </Text>
          </View>

          {/* Images */}
          <View style={styles.imageSection}>
            <Image
              source={{
                uri: 'https://via.placeholder.com/250x500/8A2BE2/FFFFFF?text=Chat+Screen+1',
              }}
              style={[styles.mockupImage, styles.mockupLeft]}
            />

            <Image
              source={{
                uri: 'https://via.placeholder.com/250x500/9932CC/FFFFFF?text=Chat+Screen+2',
              }}
              style={[styles.mockupImage, styles.mockupRight]}
            />
          </View>

          {/* Auth Buttons */}
          <View style={styles.authButtons}>
            <TouchableOpacity style={styles.signInBtn}>
              <Text style={styles.signInText}>Sign In</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.signUpBtn}>
              <Text style={styles.signUpText}>Create Account</Text>
            </TouchableOpacity>
          </View>

          {/* Store Buttons */}
          <View style={styles.appBadgeContainer}>
            <TouchableOpacity style={styles.appBadge}>
              <Text style={styles.appBadgeText}>App Store</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.appBadge}>
              <Text style={styles.appBadgeText}>Google Play</Text>
            </TouchableOpacity>
          </View>

        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: height * 0.05,
  },

  /* LOGO */
  logoContainer: {
    marginTop: Platform.OS === 'android' ? 20 : 0,
  },
  logoBox: {
    width: 90,
    height: 90,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)', // Nice soft transparency
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  logoText: {
    fontSize: 42,
    color: 'white',
    fontWeight: '800',
  },

  /* Text */
  textSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  mainTitle: {
    fontSize: width * 0.085,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1.2,
  },
  subTitle: {
    fontSize: width * 0.045,
    color: '#f0d7ff',
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.9,
  },

  /* Images */
  imageSection: {
    height: height * 0.38,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockupImage: {
    width: width * 0.38,
    height: height * 0.38 * (500 / 250),
    resizeMode: 'contain',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    position: 'absolute',
  },
  mockupLeft: {
    left: width * 0.12,
    transform: [{ rotate: '-8deg' }],
  },
  mockupRight: {
    right: width * 0.12,
    transform: [{ rotate: '8deg' }],
  },

  /* Buttons */
  authButtons: {
    width: '85%',
    marginTop: 25,
    alignItems: 'center',
  },

  signInBtn: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 14,
    borderRadius: 30,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  signInText: {
    textAlign: 'center',
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },

  signUpBtn: {
    width: '100%',
    backgroundColor: '#ffffff',
    paddingVertical: 15,
    borderRadius: 30,
  },
  signUpText: {
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: '#7b2cbf',
  },

  /* Store Buttons */
  appBadgeContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  appBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  appBadgeText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default LandingPage;
