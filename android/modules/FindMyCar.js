import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  BackAndroid,
  TouchableHighlight,
  AsyncStorage,
  ActivityIndicator
} from 'react-native';
import MapView from 'react-native-maps';

export default class FindMyCar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      latitude: undefined,
      longitude: undefined,
      marker: { insert: <View></View> }
    };
    this.directions = [];
    this.directionList = [];
    this.directionContainerHeight = 80;
    this.initialHeight = 80;
    this.userLatitude = undefined;
    this.userLongitude = undefined;
  }

  render() {
    return (
      <View style={styles.container}>
        <View style={{zIndex: 10}}>
          <ActivityIndicator/>
        </View>

        <View
        style={styles.directionsContainer}
        onTouchMove={ this.handleContainerResize.bind(this) }>
          { this.directions }
  {console.log('map render', this.state.latitude)}
        </View>
        <MapView.Animated
          ref={ref => { this.animatedMap = ref; }}
          style={styles.map}
          mapType="hybrid"
          showsUserLocation={true}

          initialRegion={{
            latitude: 37.78825,
            longitude: -122.4324,
            latitudeDelta: 0.0048,
            longitudeDelta: 0.0020
          }}>

          { this.state.marker.insert }

        </MapView.Animated>
        <TouchableHighlight
        style={styles.button}
        underlayColor='blue'
        onPress={ this.handleNavigation.bind(this) }>

          <Text style={styles.text}> Get Directions </Text>

        </TouchableHighlight>
      </View>
    );
  }

  async getCoords() {
    try {
      if (isNaN(this.props.latitude) || this.props.latitude === undefined) {
        console.log('getCoords storage', 'props', this.props.latitude, 'isnan', isNaN(this.props.latitude), 'if', isNaN(this.props.latitude) || this.props.latitude === undefined)
        this.setState({
          latitude: parseFloat(await AsyncStorage.getItem('@Parked:latitude')),
          longitude: parseFloat(await AsyncStorage.getItem('@Parked:longitude'))
        });
      } else {
        console.log('getCoords props', 'props', this.props.latitude, 'isnan', isNaN(this.props.latitude), 'if', isNaN(this.props.latitude) || this.props.latitude === undefined)
        this.setState({
          latitude: this.props.latitude,
          longitude: this.props.longitude
        });
      }
      AsyncStorage.setItem('@Parked:latitude', this.state.latitude + '');
      AsyncStorage.setItem('@Parked:longitude', this.state.longitude + '');
    } catch(error) {
      console.log('async getCoords() exception', error);
    }
    navigator.geolocation.getCurrentPosition(
      position => {
        this.userLatitude = parseFloat(position.coords.latitude);
        this.userLongitude = parseFloat(position.coords.longitude);
        this.setMarker();
        this.getDirections();
      }, error => console.log(error), { enableHighAccuracy: false, timeout: 20000, maximumAge: 1000 }
    );
  }

  componentWillMount() {
    this.getCoords();
  }

  componentDidMount() {
    BackAndroid.addEventListener('hardwareBackPress', () => {
      if (this.props.navigator && this.props.navigator.getCurrentRoutes().length > 1) {
          this.props.navigator.pop();
          return true;
      }
      return false
    });
  };

  componentWillUnmount() {
    BackAndroid.removeEventListener('hardwareBackPress', () => {
      if (this.props.navigator && this.props.navigator.getCurrentRoutes().length > 1) {
          this.props.navigator.pop();
          return true;
      }
      return false;
    });
  }

  setMarker() {
    console.log('marker coords', 'props', this.props.latitude, 'state', this.state.latitude)
    console.log('bools', this.props.latitude === undefined, isNaN(this.props.latitude), this.props.latitude === undefined || isNaN(this.props.latitude) )
    if (isNaN(this.props.latitude) || this.props.latitude === undefined) {
      this.setState({
        marker: {insert:
          <MapView.Marker
            coordinate={
              {
                latitude: this.state.latitude,
                longitude: this.state.longitude
              }
            }
            title={ 'You are parked here' }>
            <MapView.Callout tooltip={true}>
              <View style={styles.customTooltip}><Text style={{color: 'white'}}>You are parked here</Text></View>
            </MapView.Callout>
          </MapView.Marker>
        }
      });
      this.animatedMap._component.animateToCoordinate({
        latitude: this.state.latitude,
        longitude: this.state.longitude
      }, 1500);
    } else {
      console.log('use props to set marker')
      this.setState({
        marker: {insert:
          <MapView.Marker
            coordinate={
              {
                latitude: this.props.latitude,
                longitude: this.props.longitude
              }
            }
            title={ 'You are parked here' }>
            <MapView.Callout tooltip={true}>
              <View style={styles.customTooltip}><Text style={{color: 'white'}}>You are parked here</Text></View>
            </MapView.Callout>
          </MapView.Marker>
        }
      });
      this.animatedMap._component.animateToCoordinate({
        latitude: this.props.latitude,
        longitude: this.props.longitude
      }, 1500);
    }
  }

  getDirections() {

    console.log('getD', 'userL', this.userLatitude, 'state', this.state.latitude)
    let directions = [];
    let key = 0;
    fetch('https://maps.googleapis.com/maps/api/directions/json?origin=' +
     this.userLatitude + ',' + this.userLongitude + '&destination=' +
      this.state.latitude + ',' + this.state.latitude + '&mode=walking&key=AIzaSyALRq2Ep7Rfw61lvdZLMzhYP41YPglqA68')
    .then((response) => {
      let res = JSON.parse(response._bodyInit); console.log(res)
      let steps = res.routes[0].legs[0].steps;
      let len = steps.length;
      let skipped = false;
      let safety;
      for (let i = 0; i < len; i++) {
        let instruction = '';
        let instructions = steps[i].html_instructions;
        for (let j = 0; j < instructions.length; j++) {
          if (instructions[j] === '<' || instructions[j] === '&') {
            safety = 0;
            if (instructions[j] === '&') instruction += ' ';
            while (true) {
              if (instructions[j] === '>' || instructions[j] === ';') break;
              if (safety > 50) break;
              safety++;
              j++;
            }
          } else {
            let char = instructions[j];
            if ((char.charCodeAt(0) > 64 && char.charCodeAt(0) < 91) &&
              instruction[instruction.length - 1] !== ' ') {
              instruction += ' ';
            }
            instruction += instructions[j];
          }
        }
        if (!skipped) {
          if (instruction.length <= 26) {
            if (instruction.trim() === 'Head') continue;
            this.directionContainerHeight = 108;
            this.initialHeight = 108;
          }
          skipped = true;
        }
        directions.push({key: key++, instruction});
      }
      this.directionList = directions;
    })
    .catch((err) => {
      console.log(err);
    });
  }

  postDirections(directions = []) {
    if (directions.length === 0) return this.directions = [<View style={styles.directionTextContainer}><Text style={styles.error}> Problem fetching directions </Text></View>];
    let result = [];
    for (let i = 0; i < directions.length; i++) {
      result.push(<View style={styles.directionTextContainer} key={directions[i].key}><Text key={directions[i].key} style={styles.directionText}>{directions[i].instruction}</Text></View>);
    }
    this.directions = result;
    styles.directionsContainer = {
        position: 'absolute',
        top: 0,
        right: 0,
        left: 0,
        height: this.directionContainerHeight,
        zIndex: 10,
        backgroundColor: '#48BBEC'
      }
      this.forceUpdate();
    };

  handleNavigation() {
    this.postDirections(this.directionList);
    const keepPace = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        position => {
          let latitude = parseFloat(position.coords.latitude);
          let longitude = parseFloat(position.coords.longitude);
          if (this.state.latitude -  latitude < .0009 ||
           this.state.longitude - longitude < .0009) {
            clearInterval(keepPace);
          }
          this.setState({
            latitude,
            longitude
          });
        },
        error => {
          // error
        }
      );
    }, 4000);
  }

  handleContainerResize(evt) {

    if (this.directionContainerHeight >= this.initialHeight) {
      styles.directionsContainer = {
        position: 'absolute',
        top: 0,
        right: 0,
        left: 0,
        height: evt.nativeEvent.pageY,
        zIndex: 15,
        backgroundColor: '#48BBEC'
      };
      this.directionContainerHeight = evt.nativeEvent.pageY;
    } else {
      styles.directionsContainer = {
          position: 'absolute',
          top: 0,
          right: 0,
          left: 0,
          height: this.initialHeight,
          zIndex: 10,
          backgroundColor: '#48BBEC'
        }
      this.directionContainerHeight = this.initialHeight;
      }
      this.forceUpdate();
    }
}


const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'center'
  },
  directionTextContainer: {
    borderWidth: 2,
    paddingTop: 6,
    paddingBottom: 6
  },
  directionText: {
    color: 'white',
    paddingLeft: 25,
    fontSize: 28
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  customTooltip: {
    backgroundColor: '#48BBEC',
    borderRadius: 5,
    padding: 5,
    height: 28,
    justifyContent: 'center'
  },
  button: {
    marginBottom: 90,
    width: 300,
    height: 70,
    zIndex: 10,
    borderWidth: 1,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'green'
  },
  text: {
    fontSize: 36,
    color: 'white'
  },
});
