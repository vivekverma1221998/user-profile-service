import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating token");
  }
};
const registerUser = asyncHandler(async (req, resp) => {
  /* 
   get the payload from the frontend
   validate the data
   check for the existing username or email
   check for images, check for avatar
   upload them to cloudinary , avatar
   create user object - insert into the db
   check for the user id and remove paswword and refresh token from the response
   return the response 
   
   */

  const { username, email, fullName, password } = req.body;
  console.log(username);
  // validation
  if (
    [username, email, fullName, password].some((field) => {
      field?.trim() === "";
    })
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // check for existing username or email
  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  // check for the file and avatar

  const avatarLocalFilePath = req.files?.avatar[0]?.path;

  let coverImageLocalFilePath;

  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalFilePath = req.files.coverImage[0].path;
  }

  if (!avatarLocalFilePath) {
    throw new ApiError(400, "Avatar file is required");
  }
  const avatar = await uploadOnCloudinary(avatarLocalFilePath);
  const coverImage = await uploadOnCloudinary(coverImageLocalFilePath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  // insert into the db
  const response = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // check user data inserted properly or not

  const createdUser = await User.findById(response._id).select({
    password: 0,
    refreshToken: 0,
    __v: 0,
  });

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while inserting into the db");
  }

  return resp
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, resp) => {
  /*
    take data from the req body
    validate username or email
    user is available or not 
    password check 
    generate access token and refresh token
    send in cookies 
 */

  const { email, username, password } = req.body;

  if (!username || !email) {
    throw new ApiError(400, "Username or email is required");
  }
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User doesnot exists");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Password Invalid");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select({
    password: 0,
    refreshToken: 0,
    __v: 0,
  });

  //setting cookies or sending

  const options = {
    httpOnly: true,
    secure: true,
  };

  return resp
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, resp) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  const option = {
    httpOnly: true,
    secure: true,
  };

  resp
    .status(200)
    .clearCookie("accessToken", option)
    .clearCookie("refreshToken", option)
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, resp) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is required");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid RefreshToken");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Token is used or expired");
    }

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    const option = {
      httpOnly: true,
      secure: true,
    };
    resp
      .status(200)
      .cookie("accessToken", accessToken, option)
      .cookie("refreshToken", newRefreshToken, option)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Access Token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(400, error?.message, "Invalid token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, resp) => {
  const { newPassword, oldPassword } = req.body;

  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Wrong old password");
  }

  user.password = newPassword;

  await user.save({ validateBeforeSave: false });

  resp
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, resp) => {
  return resp
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, resp) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    // check for the validation
    throw new ApiError(400, "email and fullName are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName: fullName,
        email: email,
      },
    },
    {
      new: true,
    }
  ).select({ password: 0 });

  resp
    .status(200)
    .json(new ApiResponse(200, user, "User updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, resp) => {
  const avatarLocalPath = req.files?.avatar[0].path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar Files are required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { avatar: avatar.url } },
    {
      new: true,
    }
  ).select({ password: 0 });

  resp.status(200).json(
    new ApiResponse(200, user, "avatar file updated") // getting error here
  );
});

const updateUserCoverImage = asyncHandler(async (req, resp) => {
  const coverImageLocalPath = req.files?.coverImage[0].path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "coverImage is required");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage) {
    throw new ApiError(400, "error while uploading on cloudinary");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage: coverImage?.url,
      },
    },
    {
      new: true,
    }
  ).select({ password: 0 });

  resp
    .status(200)
    .json(new ApiResponse(200, user, "cover image updated successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
};
