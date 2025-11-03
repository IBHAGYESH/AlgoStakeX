export const formatWalletAddress = (address) => {
  if (!address) return "";
  if (address.length <= 10) return address;
  return `${address.slice(0, 5)}...${address.slice(-5)}`;
};

export const getRandomAvatar = () => {
  const avatars = [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=1",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=2",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=3",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=4",
  ];
  return avatars[Math.floor(Math.random() * avatars.length)];
};
