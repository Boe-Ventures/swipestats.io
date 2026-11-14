interface DevDeleteButtonProps {
  profileId: string;
  profileIdFieldName: "tinderId" | "hingeId";
  buttonText: string;
  confirmMessage: string;
  buttonClassName?: string;
  onDelete: (id: { tinderId?: string; hingeId?: string }) => void;
  isPending: boolean;
}

export function DevDeleteButton({
  profileId,
  profileIdFieldName,
  buttonText,
  confirmMessage,
  buttonClassName = "w-full rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50",
  onDelete,
  isPending,
}: DevDeleteButtonProps) {
  const handleClick = () => {
    if (confirm(confirmMessage)) {
      onDelete({
        [profileIdFieldName]: profileId,
      });
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={buttonClassName}
    >
      {isPending ? "Deleting..." : buttonText}
    </button>
  );
}
