import User from '../models/userModel.js';

export async function getProfile(req, res) {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

export async function updateProfile(req, res) {
  try {
    const updates = {};
    if (typeof req.body.username === 'string') {
      const username = req.body.username.trim();
      if (username.length < 3) {
        return res.status(400).json({ message: 'Username must be at least 3 characters' });
      }
      updates.username = username;
    }

    if (typeof req.body.phone === 'string') {
      const phone = req.body.phone.trim();
      if (phone && !/^\+?[0-9\s()-]{7,20}$/.test(phone)) {
        return res.status(400).json({ message: 'Please use a valid mobile number' });
      }
      updates.phone = phone;
    }

    if (typeof req.body.profileImage === 'string') {
      const profileImage = req.body.profileImage.trim();
      if (profileImage && !/^data:image\/(jpeg|png|webp|gif);base64,[a-z0-9+/=]+$/i.test(profileImage)) {
        return res.status(400).json({ message: 'Profile image must be a valid image file' });
      }
      const encodedImage = profileImage.split(',')[1] || '';
      if (Buffer.byteLength(encodedImage, 'base64') > 500 * 1024) {
        return res.status(400).json({ message: 'Profile image must be 500 KB or smaller' });
      }
      updates.profileImage = profileImage;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No allowed profile fields provided' });
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true,
      context: 'query',
    }).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}
