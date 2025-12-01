interface BackdropProps {
  onClick: () => void;
}

export default function Backdrop({ onClick }: BackdropProps) {
  return (
    <div
      className="stash-pay-backdrop"
      onClick={onClick}
    />
  );
}

