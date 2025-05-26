import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useRegisterMutation } from '@/store/api/authApi';
import { useDispatch } from 'react-redux';
import { setCredentials } from '@/store/slices/authSlice';
import { Input, Text, Icon, Pressable } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [register, { isLoading }] = useRegisterMutation();
  const dispatch = useDispatch();
  const router = useRouter();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    return phoneRegex.test(phone);
  };

  const handleRegister = async () => {
    // Basic validation
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }
    if (!validatePhone(phone)) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter a password');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      const result = await register({ username, email, phone, password }).unwrap();
      dispatch(setCredentials({ user: result.user, token: result.token }));
      router.replace('/(tabs)/index');
    } catch (error: any) {
      Alert.alert(
        'Registration Failed',
        error.data?.message || 'Something went wrong. Please try again.'
      );
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>Create Account</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Username</Text>
          <Input
            key="username-input"
            w="100%"
            size="lg"
            placeholder="Enter your username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            borderRadius={8}
            borderWidth={1}
            borderColor="#ddd"
            backgroundColor="#fff"
            py={3}
            px={4}
            disableFullscreenUI={true}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <Input
            key="email-input"
            w="100%"
            size="lg"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            borderRadius={8}
            borderWidth={1}
            borderColor="#ddd"
            backgroundColor="#fff"
            py={3}
            px={4}
            disableFullscreenUI={true}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Phone</Text>
          <Input
            key="phone-input"
            w="100%"
            size="lg"
            placeholder="Enter your phone number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            borderRadius={8}
            borderWidth={1}
            borderColor="#ddd"
            backgroundColor="#fff"
            py={3}
            px={4}
            disableFullscreenUI={true}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <Input
            key="password-input"
            w="100%"
            size="lg"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            type={showPassword ? "text" : "password"}
            borderRadius={8}
            borderWidth={1}
            borderColor="#ddd"
            backgroundColor="#fff"
            py={3}
            px={4}
            autoCorrect={false}
            disableFullscreenUI={true}
            InputRightElement={
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                <Icon
                  as={<MaterialIcons name={showPassword ? "visibility" : "visibility-off"} />}
                  size={5}
                  mr="2"
                  color="muted.400"
                />
              </Pressable>
            }
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirm Password</Text>
          <Input
            key="confirm-password-input"
            w="100%"
            size="lg"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            type={showConfirmPassword ? "text" : "password"}
            borderRadius={8}
            borderWidth={1}
            borderColor="#ddd"
            backgroundColor="#fff"
            py={3}
            px={4}
            autoCorrect={false}
            disableFullscreenUI={true}
            InputRightElement={
              <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Icon
                  as={<MaterialIcons name={showConfirmPassword ? "visibility" : "visibility-off"} />}
                  size={5}
                  mr="2"
                  color="muted.400"
                />
              </Pressable>
            }
          />
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Register</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={styles.linkText}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#007BFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 5,
  },
  footerText: {
    fontSize: 16,
  },
  linkText: {
    fontSize: 16,
    color: '#007BFF',
    fontWeight: '600',
  },
});
