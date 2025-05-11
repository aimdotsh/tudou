import styles from './style.module.css';

interface ILightsProps {
  setLights: (_lights: boolean) => void;
  lights: boolean;
}

const LightsControl = ({ setLights, lights }: ILightsProps) => {

  return (
        <div className={"mapboxgl-ctrl mapboxgl-ctrl-group  " + styles.lights}>
        </div>
  );
};

export default LightsControl;
