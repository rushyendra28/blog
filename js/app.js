// Initialize Supabase client
const supabase = supabase.createClient(
    'https://eomhlompjovjtiwwdgbo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvbWhsb21wam92anRpd3dkZ2JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3NDU2ODcsImV4cCI6MjA1OTMyMTY4N30.gbEe3-o07SDoBC0IJowFRDxXXc0PLk7avEykYo5AYyQ'
);

// DOM Elements
const postsContainer = document.getElementById('posts');
const adminPanel = document.getElementById('adminPanel');
const loginBtn = document.getElementById('loginBtn');
const newPostForm = document.getElementById('newPostForm');

// State management
let currentUser = null;

// Authentication
loginBtn.addEventListener('click', async () => {
    if (currentUser) {
        await supabase.auth.signOut();
        currentUser = null;
        loginBtn.textContent = 'Login';
        adminPanel.classList.add('hidden');
        return;
    }

    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'github'
        });
        if (error) throw error;
    } catch (error) {
        console.error('Error logging in:', error.message);
        alert('Failed to login. Please try again.');
    }
});

// Auth state changes
supabase.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
    loginBtn.textContent = currentUser ? 'Logout' : 'Login';
    adminPanel.classList.toggle('hidden', !currentUser);
});

// Load posts
async function loadPosts() {
    try {
        const { data: posts, error } = await supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        postsContainer.innerHTML = '';
        posts.forEach(post => {
            const postElement = createPostElement(post);
            postsContainer.appendChild(postElement);
        });
    } catch (error) {
        console.error('Error loading posts:', error.message);
    }
}

// Create post element
function createPostElement(post) {
    const article = document.createElement('article');
    article.className = 'bg-white dark:bg-gray-800 rounded-lg shadow p-6';
    article.innerHTML = `
        <h2 class="text-xl font-bold mb-2 dark:text-white">
            <a href="/post.html?id=${post.id}" class="hover:text-blue-500">
                ${post.title}
            </a>
        </h2>
        <div class="text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>${new Date(post.created_at).toLocaleDateString()}</span>
            <span class="mx-2">|</span>
            <span>${post.category}</span>
        </div>
        <div class="post-content dark:text-gray-300">
            ${post.content.slice(0, 200)}${post.content.length > 200 ? '...' : ''}
            <div class="fade-bottom"></div>
        </div>
        <div class="mt-4">
            <a href="/post.html?id=${post.id}" 
               class="text-blue-500 hover:text-blue-600 font-medium">
                Read More →
            </a>
        </div>
        <div class="mt-4 space-x-2">
            ${post.tags.map(tag => 
                `<span class="inline-block bg-gray-200 dark:bg-gray-700 rounded-full px-3 py-1 text-sm">
                    ${tag}
                </span>`
            ).join('')}
        </div>
        ${currentUser ? `
            <div class="mt-4 space-x-2">
                <button onclick="editPost(${post.id})" class="text-blue-500">Edit</button>
                <button onclick="deletePost(${post.id})" class="text-red-500">Delete</button>
            </div>
        ` : ''}
    `;
    return article;
}

// Create new post
newPostForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('postTitle').value;
    const category = document.getElementById('postCategory').value;
    const tags = document.getElementById('postTags').value.split(',').map(tag => tag.trim());
    const content = document.getElementById('postContent').value;

    try {
        const { data, error } = await supabase
            .from('posts')
            .insert([
                { title, category, tags, content }
            ]);

        if (error) throw error;

        newPostForm.reset();
        loadPosts();
    } catch (error) {
        console.error('Error creating post:', error.message);
        alert('Failed to create post. Please try again.');
    }
});

// Edit post
async function editPost(postId) {
    try {
        const { data: post, error } = await supabase
            .from('posts')
            .select('*')
            .eq('id', postId)
            .single();

        if (error) throw error;

        // Populate form
        document.getElementById('postTitle').value = post.title;
        document.getElementById('postCategory').value = post.category;
        document.getElementById('postTags').value = post.tags.join(', ');
        document.getElementById('postContent').value = post.content;

        // Update form submit handler
        newPostForm.onsubmit = async (e) => {
            e.preventDefault();
            await updatePost(postId);
        };
    } catch (error) {
        console.error('Error loading post for edit:', error.message);
    }
}

// Update post
async function updatePost(postId) {
    const title = document.getElementById('postTitle').value;
    const category = document.getElementById('postCategory').value;
    const tags = document.getElementById('postTags').value.split(',').map(tag => tag.trim());
    const content = document.getElementById('postContent').value;

    try {
        const { error } = await supabase
            .from('posts')
            .update({ title, category, tags, content })
            .eq('id', postId);

        if (error) throw error;

        newPostForm.reset();
        newPostForm.onsubmit = null;
        loadPosts();
    } catch (error) {
        console.error('Error updating post:', error.message);
        alert('Failed to update post. Please try again.');
    }
}

// Delete post
async function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
        const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', postId);

        if (error) throw error;

        loadPosts();
    } catch (error) {
        console.error('Error deleting post:', error.message);
        alert('Failed to delete post. Please try again.');
    }
}

// Add comment
async function addComment(event, postId) {
    event.preventDefault();
    const form = event.target;
    const name = form.querySelector('input').value;
    const content = form.querySelector('textarea').value;

    try {
        const { error } = await supabase
            .from('comments')
            .insert([
                { post_id: postId, name, content }
            ]);

        if (error) throw error;

        form.reset();
        loadComments(postId);
    } catch (error) {
        console.error('Error adding comment:', error.message);
        alert('Failed to add comment. Please try again.');
    }
}

// Load comments
async function loadComments(postId) {
    try {
        const { data: comments, error } = await supabase
            .from('comments')
            .select('*')
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        const container = document.getElementById(`comments-${postId}`);
        container.innerHTML = comments.map(comment => `
            <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded mb-2">
                <div class="font-semibold dark:text-white">${comment.name}</div>
                <div class="text-gray-600 dark:text-gray-300">${comment.content}</div>
                <div class="text-sm text-gray-500 dark:text-gray-400">
                    ${new Date(comment.created_at).toLocaleDateString()}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading comments:', error.message);
    }
}

// Dark mode toggle
document.addEventListener('alpine:init', () => {
    Alpine.data('darkMode', () => ({
        dark: false,
        toggle() {
            this.dark = !this.dark;
            document.documentElement.classList.toggle('dark', this.dark);
        }
    }));
});

// Initialize
loadPosts();