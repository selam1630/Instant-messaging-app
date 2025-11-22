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
      colors={['#4B0082', '#8A2BE2', '#DA70D6']} // Deep Purple to Medium Orchid
      style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.contentContainer}>
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            {/* You can replace this with your actual app logo */}
            <View style={styles.placeholderLogo}>
              <Text style={styles.placeholderLogoText}>IM</Text>
            </View>
          </View>

          {/* Text Section */}
          <View style={styles.textSection}>
            <Text style={styles.mainTitle}>CONNECT INSTANTLY</Text>
            <Text style={styles.subTitle}>
              Seamless Messaging, Securely Delivered
            </Text>
          </View>

          {/* Image/Mockup Section */}
          <View style={styles.imageSection}>
            <Image
              source={{
                uri: 'https://via.placeholder.com/250x500/8A2BE2/FFFFFF?text=Chat+Screen+1',
              }} // Placeholder for your chat screen 1
              style={[styles.mockupImage, styles.mockupImageLeft]}
            />
            <Image
              source={{
                uri: 'https://via.placeholder.com/250x500/9932CC/FFFFFF?text=Chat+Screen+2',
              }} // Placeholder for your chat screen 2
              style={[styles.mockupImage, styles.mockupImageRight]}
            />
          </View>

          {/* App Store Badges (Optional - You can add actual images) */}
          <View style={styles.appBadgeContainer}>
            <TouchableOpacity style={styles.appBadge}>
              <Text style={styles.appBadgeText}>Download on the App Store</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.appBadge}>
              <Text style={styles.appBadgeText}>Get it on Google Play</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: height * 0.05,
  },
  logoContainer: {
    marginBottom: 20,
    marginTop: Platform.OS === 'android' ? 20 : 0, // Adjust for Android status bar
  },
  placeholderLogo: {
    width: 80,
    height: 80,
    borderRadius: 15,
    backgroundColor: '#9370DB', // Medium Purple
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  placeholderLogoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
  },
  textSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  mainTitle: {
    fontSize: width * 0.08,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  subTitle: {
    fontSize: width * 0.045,
    color: '#E0BBE4', // Light purple
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: -0.5, height: 0.5 },
    textShadowRadius: 8,
  },
  imageSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 40,
    height: height * 0.4, // Make the image section take up more vertical space
  },
  mockupImage: {
    width: width * 0.38,
    height: height * 0.38 * (500 / 250), // Maintain aspect ratio
    resizeMode: 'contain',
    borderRadius: 25,
    borderColor: 'rgba(255,255,255,0.6)',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 20,
    position: 'absolute', // Allow overlapping
  },
  mockupImageLeft: {
    left: width * 0.1,
    transform: [{ rotate: '-10deg' }],
    zIndex: 1, // Bring to front
  },
  mockupImageRight: {
    right: width * 0.1,
    transform: [{ rotate: '10deg' }],
    zIndex: 0, // Keep slightly behind
  },
  appBadgeContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  appBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 30,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  appBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LandingPage;