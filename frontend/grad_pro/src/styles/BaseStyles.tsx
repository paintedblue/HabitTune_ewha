import { StyleSheet } from "react-native";

const BaseStyles = StyleSheet.create({
    row:{
        flexDirection: 'row',
        justifyContent:'center',
        alignItems:'center',
    },
    flexContainer:{
        flex: 1,
        justifyContent:'flex-start',
        alignItems:'center',
        width:'100%',

    },
    contentContainer:{
        flex: 1,
        justifyContent:'space-between',
        alignItems:'center',
        width:'100%'
    },
    topContainer:{
        height:'20%',
        width:'100%',
        justifyContent:'flex-start',
        alignItems:'center',
    },
    middleContainer:{
        flex: 1,
        width:'100%',
        justifyContent:'center',
        alignItems:'center',
    },
    bottomContainer:{
        height:'30%',
        width:'100%',
        justifyContent:'flex-start',
        alignItems:'center',
    },
    headerContainer:{
        flexDirection:'row',
        justifyContent:'center',
        marginVertical:5,
    },
    tabBarContainer:{
    },
    mainText:{
        fontFamily: "Jua-Regular",
        textAlign: 'center',
        color: '#FFF',
        textShadowColor:"rgba(0, 0, 0, 0.5)",
        textShadowOffset:{width:2, height: 2},
        textShadowRadius: 3,
    },
    button:{
        padding:10,
        borderRadius:15,
    },
    text:{
        fontFamily: "Jua-Regular",
        textAlign: 'center',
        color: '#FFF',
    },
});

export default BaseStyles;