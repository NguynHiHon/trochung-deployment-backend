const UserInfos = require('../models/UserInfo');

const userInfoController = {
    // API 1: Tạo hoặc cập nhật thông tin người dùng
    createOrUpdateUserInfo: async (req, res) => {
        try {
            console.log('=== API POST /api/user-info được gọi ===');
            console.log('User ID:', req.user?.id);
            console.log('Request body:', req.body);
            
            const userId = req.user.id; // Từ middleware authentication
            const {
                fullName,
                avatar,
                age,
                gender,
                profession,
                interests,
                habits,
                dislikes,
                bio,
                phoneNumber
            } = req.body;

            // Tìm và cập nhật hoặc tạo mới
            let userInfo = await UserInfos.findOne({ userId });
            
            if (userInfo) {
                // Cập nhật thông tin
                Object.assign(userInfo, {
                    fullName,
                    avatar,
                    age,
                    gender,
                    profession,
                    interests: interests || [],
                    habits: habits || [],
                    dislikes: dislikes || [],
                    bio,
                    phoneNumber
                });
            } else {
                // Tạo mới
                userInfo = new UserInfos({
                    userId,
                    fullName,
                    avatar,
                    age,
                    gender,
                    profession,
                    interests: interests || [],
                    habits: habits || [],
                    dislikes: dislikes || [],
                    bio,
                    phoneNumber
                });
            }

            await userInfo.save();

            res.status(200).json({
                message: 'Lưu thông tin thành công',
                data: userInfo
            });

        } catch (error) {
            console.error('=== LỖI trong createOrUpdateUserInfo ===');
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Full error:', error);
            
            res.status(500).json({
                message: 'Lỗi server: ' + error.message,
                error: error.message
            });
        }
    },

    // API 2: Lấy thông tin người dùng hiện tại  
    getMyInfo: async (req, res) => {
        try {
            const userId = req.user.id;

            const userInfo = await UserInfos.findOne({ userId });

            if (!userInfo) {
                return res.status(404).json({
                    message: 'Chưa có thông tin cá nhân. Vui lòng cập nhật thông tin.',
                    data: null
                });
            }

            res.status(200).json({
                message: 'Lấy thông tin thành công',
                data: userInfo
            });

        } catch (error) {
            console.error('Error in getMyInfo:', error);
            res.status(500).json({
                message: 'Lỗi server',
                error: error.message
            });
        }
    }
};

module.exports = userInfoController;