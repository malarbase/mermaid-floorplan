import type { ParentComponent } from 'solid-js';
import BanGate from '~/components/BanGate';

const ProtectedLayout: ParentComponent = (props) => <BanGate>{props.children}</BanGate>;

export default ProtectedLayout;
