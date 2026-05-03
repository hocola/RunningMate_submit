declare module 'react-native-compass-heading' {
  const CompassHeading: {
    start: (
      degree: number,
      callback: (data: { heading: number }) => void
    ) => void;
    stop: () => void;
  };

  export default CompassHeading;
}
