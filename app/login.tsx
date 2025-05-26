import React, {useState, useRef, useEffect} from 'react';
import { StyleSheet, View, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useLoginMutation } from '@/store/api/authApi';
import { useDispatch } from 'react-redux';
import { setCredentials } from '@/store/slices/authSlice';
import { Input, Text, Icon, Pressable, FormControl } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import { Formik } from 'formik';
import * as Yup from 'yup';

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useDispatch();
  const router = useRouter();

  // Create refs for input fields to manage focus
  const passwordInputRef = useRef(null);

  // Add this to check render cycles
  useEffect(() => {
    console.log('LoginScreen rendered');
  });

  // Validation schema using Yup
  const LoginSchema = Yup.object().shape({
    identifier: Yup.string()
      .required('Username, email, or phone is required'),
    password: Yup.string()
      .required('Password is required')
  });

  const handleLogin = async (values, { setSubmitting }) => {
    try {
      const result = await login({ 
        identifier: values.identifier, 
        password: values.password 
      }).unwrap();
      dispatch(setCredentials({ user: result.user, token: result.token }));
      router.replace('/(tabs)/index');
    } catch (error) {
      Alert.alert(
        'Login Failed',
        error.data?.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <Formik
        initialValues={{ identifier: '', password: '' }}
        validationSchema={LoginSchema}
        onSubmit={handleLogin}
      >
        {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting }) => (
          <>
            <View style={styles.inputContainer}>
              <FormControl isInvalid={touched.identifier && errors.identifier}>
                <Text style={styles.label}>Username / Email / Phone</Text>
                <Input
                  // key="identifier-input"
                  w="100%"
                  size="lg"
                  placeholder="Enter your username, email, or phone"
                  value={values.identifier}
                  onChangeText={handleChange('identifier')}
                  onBlur={handleBlur('identifier')}
                  autoCapitalize="none"
                  autoCorrect={false}
                  borderRadius={8}
                  borderWidth={1}
                  borderColor={touched.identifier && errors.identifier ? "red.500" : "#ddd"}
                  backgroundColor="#fff"
                  py={3}
                  px={4}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  blurOnSubmit={false}
                  disableFullscreenUI={true}
                />
                {touched.identifier && errors.identifier && (
                  <FormControl.ErrorMessage>{errors.identifier}</FormControl.ErrorMessage>
                )}
              </FormControl>
            </View>

            <View style={styles.inputContainer}>
              <FormControl isInvalid={touched.password && errors.password}>
                <Text style={styles.label}>Password</Text>
                <Input
                  // key="password-input"
                  w="100%"
                  size="lg"
                  placeholder="Enter your password"
                  value={values.password}
                  onChangeText={handleChange('password')}
                  onBlur={handleBlur('password')}
                  type={showPassword ? "text" : "password"}
                  borderRadius={8}
                  borderWidth={1}
                  borderColor={touched.password && errors.password ? "red.500" : "#ddd"}
                  backgroundColor="#fff"
                  py={3}
                  px={4}
                  ref={passwordInputRef}
                  returnKeyType="done"
                  onSubmitEditing={() => handleSubmit()}
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
                {touched.password && errors.password && (
                  <FormControl.ErrorMessage>{errors.password}</FormControl.ErrorMessage>
                )}
              </FormControl>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleSubmit}
              disabled={isLoading || isSubmitting}
            >
              {isLoading || isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Login</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </Formik>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account?</Text>
        <TouchableOpacity onPress={() => router.push('/register')}>
          <Text style={styles.linkText}>Register</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
