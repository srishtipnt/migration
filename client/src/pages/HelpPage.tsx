import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Search, 
  FileText, 
  Code, 
  Database, 
  Globe, 
  Zap, 
  Shield, 
  Clock, 
  Users, 
  ChevronDown, 
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Info,
  ExternalLink,
  Mail,
  MessageSquare,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const HelpPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['getting-started']));
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    priority: 'medium'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulate API call - in a real app, this would send to your backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Message sent successfully! We\'ll get back to you within 24 hours.');
      setShowContactModal(false);
      setContactForm({
        name: '',
        email: '',
        subject: '',
        message: '',
        priority: 'medium'
      });
    } catch (error) {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setContactForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const helpSections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <Zap className="w-5 h-5" />,
      content: [
        {
          title: 'How to Start a Migration',
          content: `1. Click "Start Migration" on the home page
2. Upload your files (single file or ZIP archive)
3. Select source and target languages
4. Click "Convert Code"
5. Review and download results`
        },
        {
          title: 'Supported File Types',
          content: `• Code files: .js, .ts, .jsx, .tsx, .vue, .py, .java, .go, .php, .rb
• Database files: .sql, .json, .cql
• Archive files: .zip, .tar.gz
• Maximum file size: 50MB per file`
        },
        {
          title: 'Quick Tips',
          content: `• Use descriptive filenames for better results
• Ensure your code is well-formatted
• Check the preview before downloading
• Save your work frequently`
        }
      ]
    },
    {
      id: 'language-support',
      title: 'Language Support',
      icon: <Code className="w-5 h-5" />,
      content: [
        {
          title: 'Frontend Frameworks',
          content: `• React (TypeScript/JavaScript)
• Vue.js
• Angular
• jQuery to Modern Frameworks`
        },
        {
          title: 'Backend Platforms',
          content: `• PHP (WordPress, Laravel) → Node.js (Express, NestJS)
• Ruby on Rails → Python (Django, Flask) / Node.js
• Java (Spring) → Go / Node.js`
        },
        {
          title: 'API Paradigms',
          content: `• REST API ↔ GraphQL
• SOAP → REST
• Legacy APIs → Modern APIs`
        },
        {
          title: 'Database Migrations',
          content: `• MySQL ↔ PostgreSQL
• MongoDB ↔ SQL Databases
• Redis ↔ MongoDB
• Cassandra ↔ MongoDB
• Elasticsearch → PostgreSQL
• SQLite → PostgreSQL`
        }
      ]
    },
    {
      id: 'migration-types',
      title: 'Migration Types',
      icon: <Database className="w-5 h-5" />,
      content: [
        {
          title: 'Code Migrations',
          content: `Convert between programming languages and frameworks while maintaining functionality and improving code quality.`
        },
        {
          title: 'Database Migrations',
          content: `Transform database schemas, queries, and data models between different database systems.`
        },
        {
          title: 'API Migrations',
          content: `Convert between different API paradigms (REST, GraphQL) and modernize legacy API structures.`
        },
        {
          title: 'Platform Migrations',
          content: `Migrate entire applications between different technology stacks and platforms.`
        }
      ]
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: <AlertCircle className="w-5 h-5" />,
      content: [
        {
          title: 'Common Issues',
          content: `• File upload fails: Check file size and format
• Conversion errors: Verify source language detection
• Empty results: Ensure target language is compatible
• Slow processing: Large files may take longer`
        },
        {
          title: 'Error Messages',
          content: `• "File type not supported": Use supported file formats
• "Language not detected": Manually select source language
• "Conversion failed": Try different target language
• "Server error": Refresh page and try again`
        },
        {
          title: 'Performance Tips',
          content: `• Break large files into smaller chunks
• Use ZIP archives for multiple files
• Ensure stable internet connection
• Close unnecessary browser tabs`
        }
      ]
    },
    {
      id: 'best-practices',
      title: 'Best Practices',
      icon: <CheckCircle className="w-5 h-5" />,
      content: [
        {
          title: 'Before Migration',
          content: `• Backup your original files
• Test with small files first
• Review source code for issues
• Plan your target architecture`
        },
        {
          title: 'During Migration',
          content: `• Monitor the conversion process
• Check intermediate results
• Validate language detection
• Adjust parameters if needed`
        },
        {
          title: 'After Migration',
          content: `• Review generated code thoroughly
• Test functionality in target environment
• Update dependencies and configurations
• Document any manual changes needed`
        }
      ]
    },
    {
      id: 'security-privacy',
      title: 'Security & Privacy',
      icon: <Shield className="w-5 h-5" />,
      content: [
        {
          title: 'Data Handling',
          content: `• Files are processed securely
• No permanent storage of your code
• Encrypted transmission
• Automatic cleanup after processing`
        },
        {
          title: 'Privacy Policy',
          content: `• We don't store your source code
• Processing logs are temporary
• No third-party data sharing
• GDPR compliant practices`
        }
      ]
    }
  ];

  const faqs = [
    {
      question: 'How long does a migration take?',
      answer: 'Most migrations complete within 1-5 minutes. Complex files or large archives may take longer. You can monitor progress in real-time.'
    },
    {
      question: 'Can I migrate multiple files at once?',
      answer: 'Yes! Upload a ZIP archive containing multiple files. The system will process each file individually and provide organized results.'
    },
    {
      question: 'What if the auto-detection is wrong?',
      answer: 'You can manually select the source and target languages from the dropdown menus. The system will use your selections instead of auto-detection.'
    },
    {
      question: 'Is my code secure during migration?',
      answer: 'Absolutely. Your files are processed securely, not stored permanently, and are automatically cleaned up after processing.'
    },
    {
      question: 'Can I preview results before downloading?',
      answer: 'Yes! The system provides a side-by-side comparison view where you can review the original and migrated code before downloading.'
    },
    {
      question: 'What if the migration fails?',
      answer: 'Check the error message for guidance. Common solutions include adjusting language selections, breaking large files into smaller chunks, or trying a different target language.'
    }
  ];

  const filteredSections = searchTerm.trim() === '' 
    ? helpSections 
    : helpSections.filter(section =>
        section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        section.content.some(item => 
          item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.content.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );

  const filteredFaqs = searchTerm.trim() === '' 
    ? faqs 
    : faqs.filter(faq =>
        faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
      );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Help & Support</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search help topics, features, or error messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Search Results Info */}
            {searchTerm.trim() !== '' && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800">
                  {filteredSections.length + filteredFaqs.length} results found for "{searchTerm}"
                </p>
              </div>
            )}

            {/* Popular Search Suggestions */}
            {searchTerm.trim() === '' && (
              <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Popular searches:</h3>
                <div className="flex flex-wrap gap-2">
                  {['migration', 'database', 'API', 'troubleshooting', 'getting started', 'file upload', 'error', 'language detection'].map((term) => (
                    <button
                      key={term}
                      onClick={() => setSearchTerm(term)}
                      className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm text-gray-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No Results Message */}
            {searchTerm.trim() !== '' && filteredSections.length === 0 && filteredFaqs.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                <p className="text-gray-600 mb-4">
                  We couldn't find any help topics matching "{searchTerm}"
                </p>
                <div className="space-y-2 text-sm text-gray-500">
                  <p>Try searching for:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Specific features like "migration", "database", "API"</li>
                    <li>Error messages you're seeing</li>
                    <li>General terms like "getting started", "troubleshooting"</li>
                  </ul>
                </div>
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Clear Search
                </button>
              </div>
            )}

            {/* Help Sections */}
            {filteredSections.map((section) => (
              <div key={section.id} className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <div className="text-emerald-600 mr-3">
                      {section.icon}
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
                  </div>
                  {expandedSections.has(section.id) ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                
                {expandedSections.has(section.id) && (
                  <div className="px-6 pb-6">
                    {section.content.map((item, index) => (
                      <div key={index} className="mb-6 last:mb-0">
                        <h3 className="text-md font-medium text-gray-900 mb-2">{item.title}</h3>
                        <div className="text-gray-600 whitespace-pre-line">{item.content}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* FAQ Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Info className="w-5 h-5 text-emerald-600 mr-3" />
                  Frequently Asked Questions
                </h2>
              </div>
              <div className="p-6">
                {filteredFaqs.length > 0 ? (
                  filteredFaqs.map((faq, index) => (
                    <div key={index} className="mb-6 last:mb-0">
                      <h3 className="text-md font-medium text-gray-900 mb-2">{faq.question}</h3>
                      <p className="text-gray-600">{faq.answer}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No FAQs match your search.</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Links */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/migrate')}
                  className="w-full flex items-center text-left p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FileText className="w-5 h-5 text-emerald-600 mr-3" />
                  <span className="text-gray-900">Start New Migration</span>
                </button>
                <button
                  onClick={() => navigate('/history')}
                  className="w-full flex items-center text-left p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Clock className="w-5 h-5 text-emerald-600 mr-3" />
                  <span className="text-gray-900">View History</span>
                </button>
              </div>
            </div>

            {/* Features Overview */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Features</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Auto Language Detection</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Multiple File Support</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Real-time Preview</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Secure Processing</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Migration History</span>
                </div>
              </div>
            </div>

            {/* Contact Support */}
            <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-6">
              <h3 className="text-lg font-semibold text-emerald-900 mb-2">Need More Help?</h3>
              <p className="text-emerald-700 mb-4">
                Can't find what you're looking for? Our support team is here to help.
              </p>
              <button 
                onClick={() => setShowContactModal(true)}
                className="w-full bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <MessageSquare className="w-5 h-5 text-emerald-600 mr-2" />
                Contact Support
              </h2>
              <button
                onClick={() => setShowContactModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleContactSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={contactForm.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={contactForm.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="your.email@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={contactForm.subject}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Brief description of your issue"
                />
              </div>

              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={contactForm.priority}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="low">Low - General question</option>
                  <option value="medium">Medium - Need assistance</option>
                  <option value="high">High - Urgent issue</option>
                  <option value="critical">Critical - System down</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={contactForm.message}
                  onChange={handleInputChange}
                  required
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Please describe your issue in detail. Include any error messages, steps to reproduce, and what you were trying to accomplish."
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpPage;
