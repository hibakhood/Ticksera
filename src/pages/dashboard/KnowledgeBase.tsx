import { useState } from 'react';
import { useStore } from '../../store';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { TextArea } from '../../components/ui/Input';
import { Search, ThumbsUp, Plus, ChevronDown, BookOpen } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';

export default function KnowledgeBase() {
  const { currentUser, kbArticles, voteHelpful, addKBArticle } = useStore();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', category: '', tags: '' });

  const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'support_manager';
  const articles = kbArticles.filter(a => a.isPublished || isAdmin);
  const filtered = articles.filter(a => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q ||
      a.title.toLowerCase().includes(q) ||
      a.content.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q) ||
      a.tags.some(t => t.toLowerCase().includes(q));
    const matchesCategory = !categoryFilter || a.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });
  const categories = [...new Set(articles.map(a => a.category))];

  const handleAddArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    addKBArticle({
      ...form,
      tags: form.tags.split(',').map(t => t.trim()),
      isPublished: true,
      createdBy: currentUser.id,
    });
    setShowForm(false);
    setForm({ title: '', content: '', category: '', tags: '' });
  };

  return (
    <div className="space-y-6 animate-fade-in premium-surface rounded-2xl p-1">
      <PageHeader
        eyebrow="Self Service"
        title="Knowledge Base"
        subtitle={`${filtered.length} article${filtered.length !== 1 ? 's' : ''} available · Step-by-step guides to help you resolve issues on your own.`}
        actions={isAdmin && (
          <Button onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4" /> New Article</Button>
        )}
      />

      {showForm && (
        <Card className="card-premium p-6">
          <form onSubmit={handleAddArticle} className="space-y-4">
            <Input label="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            <TextArea label="Content (Markdown)" rows={6} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} required />
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required />
              <Input label="Tags (comma-separated)" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <Button type="submit">Publish Article</Button>
              <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Search articles..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategoryFilter('')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            !categoryFilter
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-primary-100 hover:text-primary-600 dark:hover:bg-primary-900/30'
          }`}>
          All
        </button>
        {categories.map(c => (
          <button key={c} onClick={() => setCategoryFilter(categoryFilter === c ? '' : c)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              categoryFilter === c
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-primary-100 hover:text-primary-600 dark:hover:bg-primary-900/30'
            }`}>
            {c}
          </button>
        ))}
      </div>

      {/* Articles */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="font-heading font-semibold text-gray-900 dark:text-white">No articles found</h3>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => (
            <Card key={a.id} className="card-premium overflow-hidden">
              <button onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-white leading-snug">{a.title}</h3>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-400 font-semibold">
                      {a.category}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" /> {a.helpfulCount}
                    </span>
                    {a.tags.slice(0, 3).map(t => <span key={t} className="text-primary-500">#{t}</span>)}
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform ${expanded === a.id ? 'rotate-180' : ''}`} />
              </button>
              {expanded === a.id && (
                <div className="px-6 pb-5 animate-fade-in">
                  <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{a.content}</div>
                  <div className="mt-4 flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => voteHelpful(a.id)}>
                      <ThumbsUp className="w-4 h-4" /> Helpful ({a.helpfulCount})
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
