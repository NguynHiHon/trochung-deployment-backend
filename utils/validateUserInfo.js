// Validation helper cho UserInfo
const validateUserInfo = {
    // Validate tuổi
    validateAge: (age) => {
        if (!age || isNaN(age)) {
            return { isValid: false, message: 'Tuổi phải là số' };
        }
        if (age < 18 || age > 100) {
            return { isValid: false, message: 'Tuổi phải từ 18 đến 100' };
        }
        return { isValid: true };
    },

    // Validate giới tính
    validateGender: (gender) => {
        const validGenders = ['Nam', 'Nữ', 'Khác'];
        if (!validGenders.includes(gender)) {
            return { isValid: false, message: 'Giới tính phải là Nam, Nữ hoặc Khác' };
        }
        return { isValid: true };
    },

    // Validate họ tên
    validateFullName: (fullName) => {
        if (!fullName || fullName.trim().length < 2) {
            return { isValid: false, message: 'Họ tên phải có ít nhất 2 ký tự' };
        }
        if (fullName.length > 100) {
            return { isValid: false, message: 'Họ tên không được quá 100 ký tự' };
        }
        return { isValid: true };
    },

    // Validate nghề nghiệp
    validateProfession: (profession) => {
        if (!profession || profession.trim().length < 2) {
            return { isValid: false, message: 'Nghề nghiệp phải có ít nhất 2 ký tự' };
        }
        if (profession.length > 100) {
            return { isValid: false, message: 'Nghề nghiệp không được quá 100 ký tự' };
        }
        return { isValid: true };
    },

    // Validate số điện thoại
    validatePhoneNumber: (phoneNumber) => {
        if (!phoneNumber) return { isValid: true }; // Optional field
        
        const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;
        if (!phoneRegex.test(phoneNumber)) {
            return { isValid: false, message: 'Số điện thoại không hợp lệ (VD: 0123456789)' };
        }
        return { isValid: true };
    },

    // Validate mảng (sở thích, thói quen, không thích)
    validateArray: (arr, fieldName, maxItems = 10) => {
        if (!arr) return { isValid: true }; // Optional field
        
        if (!Array.isArray(arr)) {
            return { isValid: false, message: `${fieldName} phải là mảng` };
        }
        
        if (arr.length > maxItems) {
            return { isValid: false, message: `${fieldName} không được quá ${maxItems} mục` };
        }
        
        // Check từng item trong mảng
        for (let i = 0; i < arr.length; i++) {
            if (typeof arr[i] !== 'string' || arr[i].trim().length === 0) {
                return { isValid: false, message: `${fieldName} chứa mục không hợp lệ` };
            }
            if (arr[i].length > 100) {
                return { isValid: false, message: `Mỗi mục trong ${fieldName} không được quá 100 ký tự` };
            }
        }
        
        return { isValid: true };
    },

    // Validate bio
    validateBio: (bio) => {
        if (!bio) return { isValid: true }; // Optional field
        
        if (bio.length > 500) {
            return { isValid: false, message: 'Giới thiệu không được quá 500 ký tự' };
        }
        return { isValid: true };
    },

    // Validate địa chỉ
  
    // Validate toàn bộ user info
    validateUserInfoData: (data) => {
        const errors = [];
        
        // Validate required fields - chỉ validate những trường bắt buộc
        if (data.fullName !== undefined) {
            const fullNameValidation = validateUserInfo.validateFullName(data.fullName);
            if (!fullNameValidation.isValid) errors.push(fullNameValidation.message);
        }
        
        if (data.age !== undefined) {
            const ageValidation = validateUserInfo.validateAge(data.age);
            if (!ageValidation.isValid) errors.push(ageValidation.message);
        }
        
        if (data.gender !== undefined) {
            const genderValidation = validateUserInfo.validateGender(data.gender);
            if (!genderValidation.isValid) errors.push(genderValidation.message);
        }
        
       
        // Validate optional fields - chỉ validate khi có dữ liệu
        if (data.phoneNumber) {
            const phoneValidation = validateUserInfo.validatePhoneNumber(data.phoneNumber);
            if (!phoneValidation.isValid) errors.push(phoneValidation.message);
        }
        
        if (data.interests && data.interests.length > 0) {
            const interestsValidation = validateUserInfo.validateArray(data.interests, 'Sở thích');
            if (!interestsValidation.isValid) errors.push(interestsValidation.message);
        }
        
        if (data.habits && data.habits.length > 0) {
            const habitsValidation = validateUserInfo.validateArray(data.habits, 'Thói quen');
            if (!habitsValidation.isValid) errors.push(habitsValidation.message);
        }
        
        if (data.dislikes && data.dislikes.length > 0) {
            const dislikesValidation = validateUserInfo.validateArray(data.dislikes, 'Những điều không thích');
            if (!dislikesValidation.isValid) errors.push(dislikesValidation.message);
        }
        
        if (data.bio) {
            const bioValidation = validateUserInfo.validateBio(data.bio);
            if (!bioValidation.isValid) errors.push(bioValidation.message);
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
};

module.exports = validateUserInfo;