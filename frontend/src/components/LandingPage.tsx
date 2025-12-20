import React from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, SafeAreaView, Dimensions, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

const { width, height } = Dimensions.get('window');

type LandingPageNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Landing'>;

type Props = {
  navigation: LandingPageNavigationProp;
};
const LandingPage: React.FC<Props> = ({ navigation }) => {
  return (
    <LinearGradient colors={['#3b0066', '#7b2cbf', '#c77dff']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.contentContainer}>

          {/* Logo */}
          <View style={styles.logoContainer}>
              <Image source={require('../assets/image.png')} style={{ width: 90, height: 90, borderRadius: 64}} />
          </View>

          {/* Text */}
          <View style={styles.textSection}>
            <Text style={styles.mainTitle}>CONNECT INSTANTLY</Text>
            <Text style={styles.subTitle}>
              Fast, Secure & Seamless Messaging for Everyone
            </Text>
          </View>

          {/* Mockup Images */}
          <View style={styles.imageSection}>
              <Image
                source={{ uri: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT5ZPkYFTRhPeoZu8xetP-a2uXF8BmP5AdrJQ&s' }}
                style={[styles.mockupImage, styles.mockupLeft]}
              />
              <Image
                source={{ uri: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT4_N8ahdrWrLixYh5zNuNybjczJiGaE_Yarw&s' }}
                style={[styles.mockupImage, styles.mockupRight]}
              />
          </View>

          {/* Sign In / Sign Up Buttons */}
          <View style={styles.authButtons}>
            <TouchableOpacity
              style={styles.signInBtn}
              onPress={() => navigation.navigate('SignIn')}
            >
              <Text style={styles.signInText}>Sign In</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.signUpBtn} onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.signUpText}>Create Account</Text>
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

  logoContainer: {
    marginTop: Platform.OS === 'android' ? 20 : 0,
  },
  logoBox: {
    width: 90,
    height: 90,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  logoText: { fontSize: 42, color: 'white', fontWeight: '800' },

  textSection: { alignItems: 'center', paddingHorizontal: 20 },
  mainTitle: { fontSize: width * 0.085, color: 'white', fontWeight: 'bold', textAlign: 'center', letterSpacing: 1.2 },
  subTitle: { fontSize: width * 0.045, color: '#f0d7ff', textAlign: 'center', marginTop: 8, opacity: 0.9 },

  imageSection: { height: height * 0.38, width: '100%', justifyContent: 'center', alignItems: 'center' },
  mockupWrapper: {
    width: '90%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative', 
  },
  mockupImage: {
    width: '48%',
    height: '90%',
    resizeMode: 'contain',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    position: 'absolute',
  },
  mockupLeft: { left: 0, transform: [{ rotate: '-8deg' }] },
  mockupRight: { right: 0, transform: [{ rotate: '8deg' }] },

  authButtons: { width: '85%', marginTop: 25, alignItems: 'center' },
  signInBtn: { width: '100%', backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 14, borderRadius: 30, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  signInText: { textAlign: 'center', color: 'white', fontSize: 17, fontWeight: '600' },
  signUpBtn: { width: '100%', backgroundColor: '#ffffff', paddingVertical: 15, borderRadius: 30 },
  signUpText: { textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#7b2cbf' },

  appBadgeContainer: { flexDirection: 'row', marginTop: 10 },
  appBadge: { backgroundColor: 'rgba(255,255,255,0.25)', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 25, marginHorizontal: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  appBadgeText: { color: 'white', fontWeight: '600' },
});

export default LandingPage;
