import React, { useContext, useState, useEffect } from 'react';
import { Text, View, TouchableOpacity, Image, StyleSheet, BackHandler } from 'react-native';
import BaseStyles from '../styles/BaseStyles';
import Header from '../components/TabBarButtons';
import SoundPlayer from 'react-native-sound-player';
import { ScrollView } from 'react-native-gesture-handler';
import api from '../utils/api';
import { SelectedCategoriesContext } from '../contexts/SelectedCategoriesContext';

const LyricMakeScreen = ({ route, navigation }) => {
  const exSongData = {
    __v: 0,
    _id: '1',
    created_at: '2024-09-20T08:35:38.081Z',
    id: '임의 id',
    instrument: 'Xylophone',
    lyric: '임시 가사입니다',
    songId: '2',
    title: '임시 제목입니다.',
    userId: '1',
    image_url: 'https://cdn.example.com/dummy-image.png' // 임시 이미지 URL
  };

  const { userId: ctxUserId } = useContext(SelectedCategoriesContext);
  const { userId: routeUserId, requestData, type } = route.params || {};
  const userId = routeUserId || ctxUserId;

  // 음원 URL 우선순위: 서버 audio_url/audioUrl/url → 생성 중(Gen) fallback
  const resolveAudioUrl = () => {
    const directUrl =
      requestData?.audio_url || requestData?.audioUrl || requestData?.url;

    if (directUrl) return directUrl;

    if (requestData?.id && type === "Gen") {
      return `https://cdn.aimlapi.com/suno/audio/?item_id=${requestData.id}`;
    }

    return undefined;
  };

  const initialAudioUrl = resolveAudioUrl();

  const [audioUrl, setAudioUrl] = useState(initialAudioUrl);
  const [title, setTitle] = useState(requestData ? requestData.title : exSongData.title);
  const [lyric, setLyric] = useState(requestData ? requestData.lyric : exSongData.lyric);

  //////////////
  const [imageUrl, setImageUrl] = useState(requestData ? requestData.image_url : exSongData.image_url); // 이미지 URL 추가

  const maintitleText = '동요 재생';

  const [isPlaying, setIsPlaying] = useState(false);

  /////////////
  const [isLyricVisible, setIsLyricVisible] = useState(true); // 가사/이미지 토글 상태 추가

  useEffect(() => {
    if (!requestData) return;

    const resolvedUrl = resolveAudioUrl();

    setMusic(resolvedUrl);
    setTitle(requestData.title);
    setLyric(requestData.lyric);
    setImageUrl(requestData.image_url); // 이미지 URL 설정
  }, [requestData, type]);

  const setMusic = (url: string | undefined | null) => {
    if (!url) {
      console.log("재생할 오디오 URL이 없습니다. 서버 audio_url 확인 필요.");
      setAudioUrl(undefined);
      setIsPlaying(false);
      return;
    }
    setAudioUrl(url);
    setIsPlaying(false);
    try {
      SoundPlayer.stop();
      SoundPlayer.loadUrl(url);
      console.log("음원 로드 요청 성공", { url });
    } catch (err) {
      console.log("음원 로드 실패:", err);
    }
  };

  useEffect(() => {
    const backAction = () => {
      SoundPlayer.stop();
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    const onFinishedLoading = ({ success, url }: { success: boolean; url: string }) => {
      console.log("사운드 로드 완료", { success, url });
    };
    const onFinishedPlaying = ({ success }: { success: boolean }) => {
      console.log("재생 완료", { success });
      setIsPlaying(false);
    };
    const onError = (err: any) => {
      console.log("재생 오류 이벤트", err);
      setIsPlaying(false);
    };

    const subLoad = SoundPlayer.addEventListener('FinishedLoadingURL', onFinishedLoading);
    const subPlay = SoundPlayer.addEventListener('FinishedPlaying', onFinishedPlaying);
    const subError = SoundPlayer.addEventListener('Error', onError);

    return () => {
      subLoad.remove();
      subPlay.remove();
      subError.remove();
      SoundPlayer.stop();
    };
  }, []);

  const playPause = () => {
    if (!audioUrl) {
      console.log("오디오 URL이 없어 재생할 수 없습니다. 서버 응답의 audio_url을 확인하세요.");
      return;
    }

    if (isPlaying) {
      SoundPlayer.pause();
      setIsPlaying(false);
    } else {
      try {
        console.log("재생 시작 요청", { audioUrl });
        SoundPlayer.stop();
        SoundPlayer.playUrl(audioUrl);  // URL을 사용하여 음악 재생
        setIsPlaying(true);
        logPlayback();
      } catch (e) {
        console.log('Error playing the sound file', e);
        setIsPlaying(false);
      }
    }
  };

  const logPlayback = async () => {
    if (!userId || !requestData?.songId) return;

    try {
      await api.post("/song/play", {
        songId: requestData.songId,
        source: "app_play_screen",
      });
      console.log("재생 로그 전송 완료", {
        userId,
        songId: requestData.songId,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.log("재생 로그 전송 실패:", err?.message || err);
    }
  };
  
  //////////////////
  // 가사/이미지 토글 함수
  const toggleLyricImage = () => {
    setIsLyricVisible((prev) => !prev);
  };

  return (
    <View style={[BaseStyles.flexContainer, { backgroundColor: '#A5BEDF' }]}>
      <Header></Header>
      <View style={[BaseStyles.contentContainer]}>
        <View style={[BaseStyles.topContainer, { height: 'auto' }]}>
          <Text style={[BaseStyles.mainText, styles.title]}>{maintitleText}</Text>
        </View>
        <View style={[BaseStyles.middleContainer, { justifyContent: 'flex-start' }]}>
          <View style={[styles.frameTitle, { marginBottom: 20 }]}>
            <Text style={[BaseStyles.text, { color: '#000', fontSize: 25 }]}>{title}</Text>
          </View>

          {/* 가사/이미지 토글 버튼 */}
          <TouchableOpacity style={[styles.frameLyric]} onPress={toggleLyricImage}>
            {/* 가사 표시 */}
            {isLyricVisible ? (
              <ScrollView style={[styles.scrollView]}>
                <Text style={[BaseStyles.text, { color: '#000', fontSize: 25 }]}>{lyric}</Text>
              </ScrollView>
            ) : (
              // 이미지 표시
              <Image source={{ uri: imageUrl }} style={styles.songImage} resizeMode="contain" />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.playButton} onPress={playPause}>
            <Image source={isPlaying ? require('../assets/imgs/playing.png') : require('../assets/imgs/play.png')} style={styles.playButtonImage}/>
        </TouchableOpacity>
        </View>

        <View style={[BaseStyles.bottomContainer, styles.bottomContainer]}>
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={() => {navigation.goBack();SoundPlayer.stop();}}>
            <Image source={require('../assets/imgs/before_button.png')} style={styles.backButtonImage} />
          </TouchableOpacity>
          {/* Play Button */}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 30,
    lineHeight: 60,
  },
  scrollView: {
    flex: 1,
  },
  frameTitle: {
    width: 230,
    position: 'relative',
    borderRadius: 10,
    backgroundColor: '#f7f7f7',
    height: 63,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    flexDirection: 'row',
  },
  frameLyric: {
    width: 300,
    position: 'relative',
    borderRadius: 10,
    backgroundColor: '#f7f7f7',
    height:"70%",
    paddingVertical: 40,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    flexDirection: 'row',
  },
  slider: {
    width: 300,
    height: 40,
    marginBottom: 0,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 300,
    marginVertical: 10,
  },
  bottomContainer: {
    height:'15%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 20,
  },
  backButton: {
    width: 70,
    height: 70,
    marginRight: 60, // Reduce space between the buttons
  },
  backButtonImage: {
    width: 70,
    height: 70,
  },
  playButton: {
    alignItems: 'center', // Center the play button
    marginTop:20,
  },
  playButtonImage: {
    width: 90,
    height: 90,
  },

  songImage: {
    width: 300,     // 이미지의 가로 크기
    height: 300,    // 이미지의 세로 크기
    borderRadius: 10,  // 이미지의 테두리 둥글게 만들기
    backgroundColor: '#f7f7f7', // 배경 색상 (이미지 로드 전 배경)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5, // Android의 그림자 효과
  },
});

export default LyricMakeScreen;
