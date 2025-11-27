// src/screens/LyricCreation.tsx
import React, { useState, useEffect } from 'react';
import { Text, View, Alert, Image, TouchableOpacity, ImageBackground, StyleSheet, PermissionsAndroid, Platform } from 'react-native';
import VoiceUtil from '../utils/VoiceUtil';
import styles from '../styles/lyricCStyle'

const LyricCreation = ({ route, navigation }) => {
  const { userId } = route.params;
  const [isRecording, setIsRecording] = useState(true);
  const [isDoneRecording, setIsDoneRecording ] = useState(true);
  const [onRecording, setOnRecording] = useState(false);
  const [answerCount, setAnswerCount] = useState(0);
  const [answer, setAnswer] = useState('');
  const [hasAudioPermission, setHasAudioPermission] = useState(Platform.OS !== 'android');
  const fields = ["mainCharacter", "likeColor", "likeThing"];

  const speechTextList = ["지금부터 간단한 질문 몇가지를 할게요.\n내가 가장 좋아하는 동물을\n말해볼까요?", "좋아요!\n다음은 내가 가장 좋아하는 색깔을\n말해볼까요?", "잘했어요!\n다음은 내가 가장 좋아하는 것을\n말해볼까요?"]
  const confirmTextList = ["내가 좋아하는 동물은", "내가 좋아하는 색은", "내가 좋아하는 것은"]

  useEffect(() => {
    const requestAudioPermission = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: '마이크 접근 권한',
              message: '음성 인식을 위해 마이크 권한이 필요합니다.',
              buttonPositive: '확인',
            },
          );

          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert('알림', '마이크 권한이 허용되지 않아 음성인식을 시작할 수 없습니다.');
            setHasAudioPermission(false);
            return;
          }

          setHasAudioPermission(true);
        } catch (error) {
          console.error('Permission request failed:', error);
          Alert.alert('알림', '마이크 권한을 요청하는 중 오류가 발생했습니다.');
          setHasAudioPermission(false);
        }
      }
    };

    requestAudioPermission();

    VoiceUtil.setSpeechResultCallback((results: string[]) => {
      setAnswer(results[0]);
      setIsDoneRecording(false);
      setOnRecording(false);
    });

    VoiceUtil.setErrorCallback((error: any) => {
      Alert.alert("인식하지 못했습니다. 다시 입력해주세요.")
      setOnRecording(false);
    });

    return () => {
      VoiceUtil.destroyRecognizer();
    };
  }, []);

  useEffect(() => {
    if (!isDoneRecording) {
      sendPreferenceToServer();
      setIsDoneRecording(true);
    }
  }, [answerCount, isDoneRecording]);  // 의존성 배열에 answer 추가

  const sendPreferenceToServer = async () => {
    console.log("Sending request to server...");
    console.log("field: ", fields[answerCount]);
    try {
      const response = await fetch(`http://192.168.0.29:3000/api/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, field: fields[answerCount], value: answer, answerCount })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Network response was not ok: ${errorText}`);
      }

      const data = await response.json();
      console.log("Response data:", data);
      setAnswer(data);
      setIsRecording(false);
    } catch (error) {
      console.error("Error during fetch operation:", error.message);
      Alert.alert("Error", error.message);
    }
  }

  const startSpeech = () => {
    if (!hasAudioPermission) {
      Alert.alert('알림', '마이크 권한이 없어 음성 인식을 시작할 수 없습니다. 설정에서 권한을 허용해주세요.');
      return;
    }

    if(!onRecording){
      VoiceUtil.startListening();
      setOnRecording(true);
    }
    else{
      VoiceUtil.stopListening();
      setOnRecording(false);
    }
  }
  const reRecording = () => {
    setIsRecording(true);
  }
  const nextStep = () => {
    if(answerCount + 1 < speechTextList.length){
      setAnswerCount(answerCount + 1);
      setIsRecording(true);
      //answerList.push(answer);
      //이부분에서 서버에 결과 전송
    }else{
      // Alert.alert("선호도 입력 완료")
      navigation.navigate('SummaryScreen', {userId : userId });
    }
  }


  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../assets/imgs/subpage2.png')}
        style={styles.backgroundImage}
        imageStyle={{ opacity: 0.3 }}
      >
        {isRecording ? 
        <View style={styles.contentContainer}>
          <View style={styles.imageContainer}>
              <Text style={styles.QuestionText}>{speechTextList[answerCount]}</Text>
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.startButton]} onPress={startSpeech}>
              <Text style={styles.buttonText}>{onRecording?"말하는 중...": "말하기"}</Text>
            </TouchableOpacity>
          </View>
        </View> 
        : 
        <View style={styles.contentContainer}>
          <View style={styles.imageContainer}>
              <Text style={styles.QuestionText}>{confirmTextList[answerCount]}</Text>
              <Text style={styles.AnswerText}>{answer}</Text>
              <Text style={styles.QuestionText}>맞나요?</Text>
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.rowContainer} onPress={reRecording}>
              <Image source={require('../assets/imgs/ReRecord.png')} style = {styles.rRImage} />
              <Text style={styles.reRecordingText}>다시 말할래요</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nextContainer} onPress={nextStep}>
              <Image source={require('../assets/imgs/right_arrow.png')} style = {styles.nextImage} />
            </TouchableOpacity>
          </View>
        </View>
        }
      </ImageBackground>
    </View>
  );
};

export default LyricCreation;

