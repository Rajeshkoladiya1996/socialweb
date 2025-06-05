import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../../utils/auth";
import PostCard from "../../../components/PostCard";
import api from "../../../utils/api";
import Head from "next/head";
import Image from "next/image";

export default function Profile() {
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    bio: "",
    location: "",
    website: "",
  });
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    if (id) {
      fetchUserProfile();
      fetchUserPosts();
    }
  }, [id]);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get(`/users/${id}`);
      setUser(response.data.user);
      setFollowing(response.data.user.is_following);
      setEditForm({
        name: response.data.user.name || "",
        bio: response.data.user.bio || "",
        location: response.data.user.location || "",
        website: response.data.user.website || "",
      });
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    }
  };

  const fetchUserPosts = async () => {
    try {
      const response = await api.get(`/posts/user/${id}`);
      setPosts(response.data.posts);
    } catch (error) {
      console.error("Failed to fetch user posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    setFollowLoading(true);
    try {
      const response = await api.post(`/users/${id}/follow`);
      setFollowing(response.data.following);
      setUser((prev) => ({
        ...prev,
        followers_count: following
          ? parseInt(prev.followers_count) - 1
          : parseInt(prev.followers_count) + 1,
      }));
    } catch (error) {
      console.error("Failed to follow/unfollow user:", error);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleLikeUpdate = (postId, liked) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            is_liked: liked,
            like_count: liked
              ? parseInt(post.like_count) + 1
              : parseInt(post.like_count) - 1,
          };
        }
        return post;
      })
    );
  };

  const handleDeletePost = async (postId) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        await api.delete(`/posts/${postId}`);
        setPosts((prev) => prev.filter((post) => post.id !== postId));
      } catch (error) {
        console.error("Failed to delete post:", error);
        alert("Failed to delete post. Please try again.");
      }
    }
  };

  const handleEditProfile = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put(`/users/${id}`, editForm);
      setUser(response.data.user);
      setShowEditModal(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
      alert("Failed to update profile. Please try again.");
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  useEffect(() => {
    console.log("posts", posts);
  }, [posts]);

  if (loading) {
    return (
      <>
        <Head>
          <title>Loading Profile... | SocialSphere</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-blue-700 flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/30 border-t-white mx-auto"></div>
            <p className="mt-6 text-white text-lg font-medium">
              Loading profile...
            </p>
          </div>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Head>
          <title>User Not Found | SocialSphere</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-blue-700 flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <div className="text-6xl mb-4">😕</div>
            <h2 className="text-3xl font-bold text-white mb-2">
              User not found
            </h2>
            <p className="text-white/80 mb-6">
              The user you're looking for doesn't exist.
            </p>
            <button
              onClick={() => router.push("/")}
              className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300"
            >
              Go Back Home
            </button>
          </div>
        </div>
      </>
    );
  }

  const isOwnProfile = currentUser?.id === parseInt(id);

  return (
    <>
      <Head>
        <title>{user.name} | SocialSphere</title>
        <meta
          name="description"
          content={`${user.name}'s profile on SocialSphere`}
        />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-blue-700">
        <div className="relative h-80 bg-gradient-to-r from-purple-500 to-blue-500">
          <div className="absolute inset-0 bg-black/20"></div>
          {user.cover_photo && (
            <Image
              src={user.cover_photo}
              alt="Cover Photo"
              fill
              className="object-cover"
            />
          )}

          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col md:flex-row items-end gap-6">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white">
                    {user.profile_picture ? (
                      <Image
                        src={user.profile_picture}
                        alt={user.name}
                        width={128}
                        height={128}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white text-4xl font-bold">
                        {user.name?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  {isOwnProfile && (
                    <button className="absolute bottom-2 right-2 bg-white rounded-full p-2 shadow-lg hover:bg-gray-50 transition-colors">
                      <svg
                        className="w-4 h-4 text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="flex-1 text-white text-center md:text-left">
                  <h1 className="text-4xl font-bold mb-2">{user.name}</h1>
                  <p className="text-white/90 text-lg mb-3">@{user.username}</p>
                  {user.bio && (
                    <p className="text-white/80 max-w-2xl mb-4">{user.bio}</p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm text-white/70">
                    {user.location && (
                      <div className="flex items-center gap-1">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        {user.location}
                      </div>
                    )}
                    {user.website && (
                      <div className="flex items-center gap-1">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                          />
                        </svg>
                        <a
                          href={user.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-white"
                        >
                          {user.website}
                        </a>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v2a1 1 0 01-1 1h-3v8a1 1 0 01-1 1H9a1 1 0 01-1-1v-8H5a1 1 0 01-1-1V8a1 1 0 011-1h3z"
                        />
                      </svg>
                      Joined{" "}
                      {new Date(user.created_at).toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  {isOwnProfile ? (
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 border border-white/30"
                    >
                      Edit Profile
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleFollow}
                        disabled={followLoading}
                        className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                          following
                            ? "bg-white/20 hover:bg-red-500/80 text-white border border-white/30"
                            : "bg-white text-purple-600 hover:bg-white/90"
                        } ${
                          followLoading ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        {followLoading
                          ? "..."
                          : following
                          ? "Unfollow"
                          : "Follow"}
                      </button>
                      <button className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 border border-white/30">
                        Message
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg border-b border-white/20">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="flex justify-center md:justify-start gap-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {posts.length}
                </div>
                <div className="text-white/70 text-sm">Posts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {user.followers_count || 0}
                </div>
                <div className="text-white/70 text-sm">Followers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {user.following_count || 0}
                </div>
                <div className="text-white/70 text-sm">Following</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg border-b border-white/20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex gap-8">
              {["posts", "media", "likes"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`py-4 px-2 font-medium capitalize transition-all duration-300 border-b-2 ${
                    activeTab === tab
                      ? "text-white border-white"
                      : "text-white/70 border-transparent hover:text-white hover:border-white/50"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              {activeTab === "posts" && (
                <div className="space-y-6">
                  {posts.length > 0 ? (
                    posts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        onLike={handleLikeUpdate}
                        onDelete={isOwnProfile ? handleDeletePost : undefined}
                        currentUser={currentUser}
                      />
                    ))
                  ) : (
                    <div className="text-center py-12 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20">
                      <div className="text-6xl mb-4">📝</div>
                      <h3 className="text-xl font-semibold text-white mb-2">
                        No posts yet
                      </h3>
                      <p className="text-white/70">
                        {isOwnProfile
                          ? "Share your first post!"
                          : `${user.name} hasn't posted anything yet.`}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "media" && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {posts
                    .filter((post) => post.image_url)
                    .map((post) => (
                      <div
                        key={post.id}
                        className="aspect-square bg-white/10 backdrop-blur-lg rounded-xl overflow-hidden border border-white/20 hover:scale-105 transition-transform duration-300"
                      >
                        <Image
                          src={post.image_url}
                          alt="Post media"
                          width={300}
                          height={300}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    ))}
                  {posts.filter((post) => post.image_url).length === 0 && (
                    <div className="col-span-full text-center py-12 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20">
                      <div className="text-6xl mb-4">🖼️</div>
                      <h3 className="text-xl font-semibold text-white mb-2">
                        No media posts
                      </h3>
                      <p className="text-white/70">
                        No photos or videos shared yet.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "likes" && (
                <div className="text-center py-12 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20">
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Liked Posts
                  </h3>
                  <p className="text-white/70">This feature is coming soon!</p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-4">About</h3>
                <div className="space-y-3 text-white/80">
                  {user.bio && (
                    <p className="text-sm leading-relaxed">{user.bio}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v2a1 1 0 01-1 1h-3v8a1 1 0 01-1-1v-8H5a1 1 0 01-1-1V8a1 1 0 011-1h3z"
                      />
                    </svg>
                    Joined {new Date(user.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {!isOwnProfile && (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                  <h3 className="text-xl font-semibold text-white mb-4">
                    Mutual Friends
                  </h3>
                  <div className="text-center py-4">
                    <p className="text-white/70 text-sm">Coming soon!</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Edit Profile
                  </h2>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleEditProfile} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bio
                    </label>
                    <textarea
                      value={editForm.bio}
                      onChange={(e) =>
                        setEditForm({ ...editForm, bio: e.target.value })
                      }
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={(e) =>
                        setEditForm({ ...editForm, location: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Where are you from?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      value={editForm.website}
                      onChange={(e) =>
                        setEditForm({ ...editForm, website: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="https://your-website.com"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 font-medium"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
