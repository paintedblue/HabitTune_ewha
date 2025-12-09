import React, {useState,useContext} from "react";
import {Text, View, TouchableOpacity, ImageBackground, Image, StyleSheet} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import BaseStyles from "../styles/BaseStyles";
import { SelectedCategoriesContext } from "../contexts/SelectedCategoriesContext"; // 컨텍스트 임포트

const HomeScreen = ({navigation}) => {
    //개발용 더미 데이터!
    const exData = {
        "title" :  "예시 제목입니다~~",
        "lyric" : "예시 가사 입니다\n가사가 좀 길수도 있어서\n 반복을 좀 하겠습니다.\n예시 가사 입니다\n가사가 좀 길수도 있어서\n 반복을 좀 하겠습니다."
    }
    //
    const { userId, childName, isAuthenticated } = useContext(SelectedCategoriesContext);

    const [showInitImage, setShowInitImage] = useState(true);

    const titleText = "새로운 음악 만들기\n모험을 떠나볼까요?"

    const handlerInitImage = () => {
        if(showInitImage){
            setShowInitImage(false);
        }
    }
    const handlerSavedSong = () => {
        if (!isAuthenticated) {
            navigation.navigate('LoginScreen', { nextScreen: 'SongListScreen' });
            return;
        }
        navigation.navigate('SongListScreen', {userId})
    }
    const handlerStart = () => {
        if (isAuthenticated) {
            navigation.navigate('HabitScreen', { userId });
        } else {
            navigation.navigate('LoginScreen', { nextScreen: 'HabitScreen' });
        }
    }

    return (
        <View style={[BaseStyles.flexContainer]}>
            {showInitImage ?
            <TouchableOpacity style={[BaseStyles.flexContainer]} onPress={handlerInitImage}>
                <ImageBackground source={require('../assets/imgs/mainpage1.png')} style={[BaseStyles.flexContainer, {justifyContent:'center'}]}>
                    <Image source={require('../assets/imgs/title.png')} />
                </ImageBackground>
            </TouchableOpacity>
            :
            <ImageBackground source={require('../assets/imgs/mainpage1.png')} style={[BaseStyles.flexContainer]}>
                <View style={[BaseStyles.contentContainer]}>
                    <View style={[BaseStyles.topContainer]}>
                    </View>
                    <View style={[BaseStyles.middleContainer]}>
                        <Text style={[BaseStyles.text, styles.titleText]}>{titleText}</Text>
                        {childName ? <Text style={[BaseStyles.text, styles.childName]}>안녕하세요, {childName}!</Text> : null}
                    </View>
                    <View style={[BaseStyles.bottomContainer]}>
                        <TouchableOpacity style={[BaseStyles.button]} onPress={handlerSavedSong}>
                            <LinearGradient colors={['#56CCF2','#2F80ED']} style={[styles.homeButton]}>
                                <Text style={[BaseStyles.text, styles.buttonText]}>저장된 노래</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity style={[BaseStyles.button]} onPress={handlerStart}>
                            <LinearGradient colors={['#56CCF2','#2F80ED']} style={[styles.homeButton]}>
                                <Text style={[BaseStyles.text, styles.buttonText]}>시작하기</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                    
                </View>
            </ImageBackground>
            }


        </View>
    )
};

const styles = StyleSheet.create({
    titleText:{
        textShadowColor:"rgba(0, 0, 0, 0.5)",
        textShadowOffset:{width: 2, height: 2},
        textShadowRadius: 3,
        fontSize: 35,
        marginBottom: 100,
        lineHeight: 50,
    },
    childName:{
        marginTop: 12,
        fontSize: 18,
    },
    homeButton:{
        width: 250,
        paddingVertical:20,
        borderRadius:15,
    },
    buttonText:{
        fontSize: 20,
    },
});

export default HomeScreen;
