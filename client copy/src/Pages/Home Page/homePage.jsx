import { useState } from "react"
import { Link } from "react-router-dom"
import styles from "./homePage.module.css"
import { isLoggedIn, getUser, isAdmin } from "../../utils/auth"

function HomePage() {
    const loggedIn = isLoggedIn()
    const currentUser = getUser()
    const [contactSubmitted, setContactSubmitted] = useState(false)
    const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" })

    const dashboardPath = isAdmin() ? "/dashboard" : "/staff"

    function handleContactSubmit(e) {
        e.preventDefault()
        setContactSubmitted(true)
        setContactForm({ name: "", email: "", message: "" })
        setTimeout(() => setContactSubmitted(false), 5000)
    }

    return (
        <div className={styles.container}>
            {/* ---------------- Navbar ---------------- */}
            <header className={styles.navbar}>
                <Link to="/" className={styles.brand}>
                    <div className={styles.brandIcon}>S</div>
                    <div className={styles.brandText}>
                        <span className={styles.brandTitle}>Stockroom</span>
                        <span className={styles.brandSub}>Inventory Management</span>
                    </div>
                </Link>

                <ul className={styles.navLinks}>
                    <li><a href="#home" className={styles.navLink}>Home</a></li>
                    <li><a href="#about" className={styles.navLink}>About</a></li>
                    <li><a href="#features" className={styles.navLink}>Features</a></li>
                    <li><a href="#how-it-works" className={styles.navLink}>How It Works</a></li>
                    <li><a href="#contact" className={styles.navLink}>Contact</a></li>
                </ul>

                <div className={styles.navActions}>
                    {loggedIn ? (
                        <Link to={dashboardPath} className={styles.dashboardBtn}>
                            {currentUser ? `${currentUser.name}'s Panel` : "Go to Dashboard"} &rarr;
                        </Link>
                    ) : (
                        <>
                            <Link to="/login" className={styles.loginBtn}>Sign In</Link>
                            <Link to="/register" className={styles.dashboardBtn}>Get Started</Link>
                        </>
                    )}
                </div>
            </header>

            {/* ---------------- Hero Section ---------------- */}
            <section id="home" className={styles.hero}>
                <div className={styles.heroContent}>
                    <span className={styles.heroBadge}>Enterprise-Grade Inventory</span>
                    <h1 className={styles.heroTitle}>
                        Smart Inventory Management <span className={styles.heroHighlight}>Made Simple</span>
                    </h1>
                    <p className={styles.heroDescription}>
                        Take total control of your catalog, multi-warehouse stock levels, reorder alerts, and team workflows in one clean, unified platform designed for precision and speed.
                    </p>
                    <div className={styles.heroButtons}>
                        {loggedIn ? (
                            <Link to={dashboardPath} className={styles.primaryHeroBtn}>
                                Open Your Dashboard &rarr;
                            </Link>
                        ) : (
                            <>
                                <Link to="/register" className={styles.primaryHeroBtn}>
                                    Get Started Free
                                </Link>
                                <Link to="/login" className={styles.secondaryHeroBtn}>
                                    Sign In to System
                                </Link>
                            </>
                        )}
                    </div>
                </div>

                <div className={styles.heroVisual}>
                    <div className={styles.heroCardMockup}>
                        <div className={styles.mockupHeader}>
                            <p className={styles.mockupTitle}>Stockroom Live Overview</p>
                            <span className={styles.mockupLiveTag}>Active</span>
                        </div>
                        <div className={styles.mockupMetrics}>
                            <div className={styles.metricBox}>
                                <p className={styles.metricLabel}>Total Products</p>
                                <p className={styles.metricVal}>1,248</p>
                            </div>
                            <div className={styles.metricBox}>
                                <p className={styles.metricLabel}>Stock Accuracy</p>
                                <p className={styles.metricVal}>99.8%</p>
                            </div>
                        </div>
                        <div className={styles.mockupList}>
                            <div className={styles.mockupRow}>
                                <div>
                                    <div className={styles.mockupRowText}>Industrial Hex Bolts (M8)</div>
                                    <div className={styles.mockupRowSub}>Central Warehouse · Restocked</div>
                                </div>
                                <span className={`${styles.mockupBadge} ${styles.badgeSuccess}`}>+500 pcs</span>
                            </div>
                            <div className={styles.mockupRow}>
                                <div>
                                    <div className={styles.mockupRowText}>Aluminum Extrusion Rail</div>
                                    <div className={styles.mockupRowSub}>Low Stock Threshold: 15</div>
                                </div>
                                <span className={`${styles.mockupBadge} ${styles.badgeWarning}`}>Reorder</span>
                            </div>
                            <div className={styles.mockupRow}>
                                <div>
                                    <div className={styles.mockupRowText}>Staff Stock Request #SR-104</div>
                                    <div className={styles.mockupRowSub}>Workshop Staff · Pending</div>
                                </div>
                                <span className={`${styles.mockupBadge} ${styles.badgeWarning}`}>Pending</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ---------------- About Section ---------------- */}
            <section id="about" className={styles.section}>
                <div className={styles.sectionHeader}>
                    <span className={styles.sectionTag}>About Stockroom</span>
                    <h2 className={styles.sectionTitle}>Built for Reliable Inventory Operations</h2>
                    <p className={styles.sectionDescription}>
                        Stockroom bridges the gap between management oversight and floor employee efficiency, ensuring every item is tracked from arrival to dispatch.
                    </p>
                </div>

                <div className={styles.aboutGrid}>
                    <div className={styles.aboutText}>
                        <h3>Stop Guessing. Know Exactly What You Have in Stock.</h3>
                        <p>
                            Traditional inventory tracking often suffers from disconnected spreadsheets, forgotten reorders, and stock discrepancies. Stockroom solves these challenges with an auditable transaction ledger and role-based panels.
                        </p>
                        <p>
                            Whether you are receiving large purchase orders from suppliers, allocating parts across multiple warehouses, or handling internal staff stock requisitions, Stockroom gives your team real-time clarity.
                        </p>
                        <div className={styles.aboutHighlights}>
                            <div className={styles.highlightItem}>
                                <div className={styles.highlightDot} />
                                <div><strong>Real-time Stock Ledger:</strong> Every change is recorded with timestamp and user attribution.</div>
                            </div>
                            <div className={styles.highlightItem}>
                                <div className={styles.highlightDot} />
                                <div><strong>Automated Thresholds:</strong> Proactive low stock alerts prevent costly production delays.</div>
                            </div>
                            <div className={styles.highlightItem}>
                                <div className={styles.highlightDot} />
                                <div><strong>Dedicated Role Panels:</strong> Distinct workflows for administrators and floor staff.</div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.aboutVisualCard}>
                        <div className={styles.statRow}>
                            <div className={styles.statItem}>
                                <p className={styles.statBig}>100%</p>
                                <p className={styles.statDesc}>Audited Stock Movements</p>
                            </div>
                            <div className={styles.statItem}>
                                <p className={styles.statBig}>0</p>
                                <p className={styles.statDesc}>Stock Shortage Surprises</p>
                            </div>
                            <div className={styles.statItem}>
                                <p className={styles.statBig}>Real-Time</p>
                                <p className={styles.statDesc}>Multi-Warehouse Sync</p>
                            </div>
                            <div className={styles.statItem}>
                                <p className={styles.statBig}>Role-Based</p>
                                <p className={styles.statDesc}>Admin & Staff Access</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ---------------- Features Section ---------------- */}
            <div id="features" className={styles.featuresWrapper}>
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionTag}>Key Capabilities</span>
                        <h2 className={styles.sectionTitle}>Everything You Need to Run Your Inventory</h2>
                        <p className={styles.sectionDescription}>
                            Purpose-built tools designed to streamline everyday operations, eliminate stockouts, and keep your teams aligned.
                        </p>
                    </div>

                    <div className={styles.featuresGrid}>
                        {/* 1. Product Management */}
                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>📦</div>
                            <h3 className={styles.featureTitle}>Product Management</h3>
                            <p className={styles.featureText}>
                                Catalog products with unique SKUs, categories, suppliers, units of measure, and pricing. Import and export catalogs in CSV with ease.
                            </p>
                        </div>

                        {/* 2. Stock Tracking */}
                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>📊</div>
                            <h3 className={styles.featureTitle}>Stock Tracking</h3>
                            <p className={styles.featureText}>
                                Immutable transaction ledger for every IN, OUT, and ADJUSTMENT movement. Monitor quantity fluctuations and track history by user.
                            </p>
                        </div>

                        {/* 3. Purchase Management */}
                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>📑</div>
                            <h3 className={styles.featureTitle}>Purchase Management</h3>
                            <p className={styles.featureText}>
                                Create formal purchase orders with suppliers, track delivery dates, and receive items directly into warehouse inventories.
                            </p>
                        </div>

                        {/* 4. Stock Movement & Requisitions */}
                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>🔄</div>
                            <h3 className={styles.featureTitle}>Stock Movements</h3>
                            <p className={styles.featureText}>
                                Transfer stock seamlessly between warehouses and enable staff members to submit internal stock requisition requests with instant review.
                            </p>
                        </div>

                        {/* 5. Low Stock Alerts */}
                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>⚠️</div>
                            <h3 className={styles.featureTitle}>Low Stock Alerts</h3>
                            <p className={styles.featureText}>
                                Dynamic threshold monitoring identifies items approaching depletion, giving managers adequate lead time to reorder.
                            </p>
                        </div>

                        {/* 6. Reports & Analytics */}
                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>📈</div>
                            <h3 className={styles.featureTitle}>Reports & Analytics</h3>
                            <p className={styles.featureText}>
                                Visual 7-day movement trends, 30-day top-moving product analysis, and comprehensive valuation summaries across all warehouses.
                            </p>
                        </div>

                        {/* 7. Employee Management */}
                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>👥</div>
                            <h3 className={styles.featureTitle}>Employee Management</h3>
                            <p className={styles.featureText}>
                                Admins can manage employee accounts, assign permissions, create new staff credentials, and instantly deactivate access when needed.
                            </p>
                        </div>
                    </div>
                </section>
            </div>

            {/* ---------------- How It Works Section ---------------- */}
            <section id="how-it-works" className={styles.section}>
                <div className={styles.sectionHeader}>
                    <span className={styles.sectionTag}>Simple Workflow</span>
                    <h2 className={styles.sectionTitle}>How Stockroom Works</h2>
                    <p className={styles.sectionDescription}>
                        Get up and running in minutes with a clear 3-step operational workflow.
                    </p>
                </div>

                <div className={styles.stepsGrid}>
                    <div className={styles.stepCard}>
                        <div className={styles.stepNumber}>1</div>
                        <h3 className={styles.stepTitle}>Setup Catalog & Warehouses</h3>
                        <p className={styles.stepText}>
                            Add your products, categories, suppliers, and warehouse locations. Set reorder thresholds for automatic alerts.
                        </p>
                    </div>

                    <div className={styles.stepCard}>
                        <div className={styles.stepNumber}>2</div>
                        <h3 className={styles.stepTitle}>Log Movements & Requests</h3>
                        <p className={styles.stepText}>
                            Record stock-in from purchase orders, log stock-out usage, and let staff request supplies directly from their panel.
                        </p>
                    </div>

                    <div className={styles.stepCard}>
                        <div className={styles.stepNumber}>3</div>
                        <h3 className={styles.stepTitle}>Monitor Alerts & Restock</h3>
                        <p className={styles.stepText}>
                            Review comprehensive reports, approve internal staff requests, and order replenishment before items run out.
                        </p>
                    </div>
                </div>
            </section>

            {/* ---------------- Contact Section ---------------- */}
            <div id="contact" className={styles.contactWrapper}>
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionTag}>Get In Touch</span>
                        <h2 className={styles.sectionTitle}>We're Here to Support Your Team</h2>
                        <p className={styles.sectionDescription}>
                            Have questions or need assistance setting up your warehouse? Reach out anytime.
                        </p>
                    </div>

                    <div className={styles.contactGrid}>
                        <div className={styles.contactInfoCard}>
                            <div>
                                <h3>Stockroom Help Center</h3>
                                <p>
                                    Our inventory specialists are available to help you configure warehouses, migrate existing spreadsheets, and train employees.
                                </p>
                                <div className={styles.contactDetails}>
                                    <div className={styles.contactRow}>
                                        <span className={styles.contactIcon}>📍</span>
                                        <span>Corporate Logistics Hub, Tech Park</span>
                                    </div>
                                    <div className={styles.contactRow}>
                                        <span className={styles.contactIcon}>✉️</span>
                                        <span>support@stockroom-ims.local</span>
                                    </div>
                                    <div className={styles.contactRow}>
                                        <span className={styles.contactIcon}>⏱️</span>
                                        <span>Mon – Fri, 9:00 AM – 6:00 PM</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={styles.contactFormCard}>
                            <h3 className={styles.formTitle}>Send an Inquiry</h3>
                            {contactSubmitted && (
                                <div className={styles.submitSuccess}>
                                    Thank you! Your message has been sent successfully. Our team will contact you shortly.
                                </div>
                            )}
                            <form onSubmit={handleContactSubmit}>
                                <div className={styles.formGroup}>
                                    <label>Full Name</label>
                                    <input
                                        type="text"
                                        placeholder="Your name"
                                        value={contactForm.name}
                                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Email Address</label>
                                    <input
                                        type="email"
                                        placeholder="you@company.com"
                                        value={contactForm.email}
                                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Message</label>
                                    <textarea
                                        rows={4}
                                        placeholder="Tell us about your inventory setup or question..."
                                        value={contactForm.message}
                                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                                        required
                                    />
                                </div>
                                <button type="submit" className={styles.submitBtn}>
                                    Submit Inquiry
                                </button>
                            </form>
                        </div>
                    </div>
                </section>
            </div>

            {/* ---------------- Footer ---------------- */}
            <footer className={styles.footer}>
                <div className={styles.footerGrid}>
                    <div>
                        <p className={styles.footerBrandTitle}>Stockroom IMS</p>
                        <p className={styles.footerBrandDesc}>
                            A robust inventory management system ensuring accuracy, control, and seamless coordination across management and warehouse employees.
                        </p>
                    </div>

                    <div className={styles.footerCol}>
                        <h4>Navigation</h4>
                        <ul className={styles.footerList}>
                            <li><a href="#home">Home</a></li>
                            <li><a href="#about">About</a></li>
                            <li><a href="#features">Features</a></li>
                            <li><a href="#how-it-works">How It Works</a></li>
                        </ul>
                    </div>

                    <div className={styles.footerCol}>
                        <h4>Portals</h4>
                        <ul className={styles.footerList}>
                            <li><Link to="/login">Employee Sign In</Link></li>
                            <li><Link to="/register">Staff Registration</Link></li>
                            <li><Link to="/dashboard">Admin Dashboard</Link></li>
                            <li><Link to="/staff">Staff Panel</Link></li>
                        </ul>
                    </div>

                    <div className={styles.footerCol}>
                        <h4>Support</h4>
                        <ul className={styles.footerList}>
                            <li><a href="#contact">Contact Support</a></li>
                            <li><Link to="/forgot-password">Password Reset</Link></li>
                        </ul>
                    </div>
                </div>

                <div className={styles.footerBottom}>
                    <p>&copy; {new Date().getFullYear()} Stockroom Inventory Management System. All rights reserved.</p>
                    <p>Designed for speed, reliability and clear workflows.</p>
                </div>
            </footer>
        </div>
    )
}

export default HomePage
