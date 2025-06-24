import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
import logging
from typing import Dict, List, Optional
from jinja2 import Template

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.from_email = os.getenv("FROM_EMAIL", "noreply@livyflow.com")
        
    def send_email(self, to_email: str, subject: str, html_content: str) -> bool:
        """Send an email using SMTP."""
        try:
            if not all([self.smtp_username, self.smtp_password]):
                logger.warning("⚠️ SMTP credentials not configured - email sending disabled")
                return False
                
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.from_email
            msg['To'] = to_email
            
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
                
            logger.info(f"✅ Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to send email to {to_email}: {str(e)}")
            return False
    
    def generate_weekly_summary_html(self, user_data: Dict, summary_data: Dict) -> str:
        """Generate HTML content for weekly budget summary email."""
        
        html_template = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your LivyFlow Weekly Budget Summary</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f8f9fa;
                }
                .container {
                    background-color: white;
                    border-radius: 10px;
                    padding: 30px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 2px solid #e9ecef;
                }
                .logo {
                    font-size: 28px;
                    font-weight: bold;
                    color: #007bff;
                    margin-bottom: 10px;
                }
                .greeting {
                    font-size: 18px;
                    color: #495057;
                    margin-bottom: 20px;
                }
                .summary-card {
                    background-color: #f8f9fa;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                    border-left: 4px solid #007bff;
                }
                .total-spent {
                    font-size: 24px;
                    font-weight: bold;
                    color: #dc3545;
                    text-align: center;
                    margin: 10px 0;
                }
                .category-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px 0;
                    border-bottom: 1px solid #e9ecef;
                }
                .category-item:last-child {
                    border-bottom: none;
                }
                .category-name {
                    font-weight: 500;
                    color: #495057;
                }
                .category-amount {
                    font-weight: bold;
                    color: #28a745;
                }
                .budget-alert {
                    background-color: #fff3cd;
                    border: 1px solid #ffeaa7;
                    border-radius: 5px;
                    padding: 15px;
                    margin: 15px 0;
                    color: #856404;
                }
                .encouragement {
                    background-color: #d4edda;
                    border: 1px solid #c3e6cb;
                    border-radius: 5px;
                    padding: 15px;
                    margin: 15px 0;
                    color: #155724;
                }
                .footer {
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e9ecef;
                    color: #6c757d;
                    font-size: 14px;
                }
                .cta-button {
                    display: inline-block;
                    background-color: #007bff;
                    color: white;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 20px 0;
                    font-weight: 500;
                }
                .cta-button:hover {
                    background-color: #0056b3;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">💰 LivyFlow</div>
                    <div class="greeting">Hello {{ user_name }}! 👋</div>
                </div>
                
                <h2>Your Weekly Budget Summary</h2>
                <p>Here's how you did this week ({{ week_range }}):</p>
                
                <div class="summary-card">
                    <h3>💰 Total Spent This Week</h3>
                    <div class="total-spent">${{ "%.2f"|format(total_spent) }}</div>
                </div>
                
                {% if top_categories %}
                <div class="summary-card">
                    <h3>📊 Top Spending Categories</h3>
                    {% for category in top_categories %}
                    <div class="category-item">
                        <span class="category-name">{{ category.name }}</span>
                        <span class="category-amount">${{ "%.2f"|format(category.amount) }}</span>
                    </div>
                    {% endfor %}
                </div>
                {% endif %}
                
                {% if exceeded_budgets %}
                <div class="budget-alert">
                    <h3>⚠️ Budget Alerts</h3>
                    <p>You exceeded your budget in the following categories:</p>
                    <ul>
                    {% for budget in exceeded_budgets %}
                        <li><strong>{{ budget.category }}</strong>: ${{ "%.2f"|format(budget.spent) }} / ${{ "%.2f"|format(budget.limit) }}</li>
                    {% endfor %}
                    </ul>
                </div>
                {% endif %}
                
                {% if encouragement_message %}
                <div class="encouragement">
                    <h3>🎉 {{ encouragement_title }}</h3>
                    <p>{{ encouragement_message }}</p>
                </div>
                {% endif %}
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="http://localhost:5173/dashboard" class="cta-button">View Full Dashboard</a>
                </div>
                
                <div class="footer">
                    <p>This email was sent by LivyFlow to help you stay on track with your financial goals.</p>
                    <p>You can manage your email preferences in your account settings.</p>
                    <p>© 2024 LivyFlow. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        template = Template(html_template)
        return template.render(
            user_name=user_data.get('name', 'there'),
            week_range=summary_data.get('week_range', 'this week'),
            total_spent=summary_data.get('total_spent', 0),
            top_categories=summary_data.get('top_categories', []),
            exceeded_budgets=summary_data.get('exceeded_budgets', []),
            encouragement_title=summary_data.get('encouragement_title', ''),
            encouragement_message=summary_data.get('encouragement_message', '')
        )

# Global email service instance
email_service = EmailService() 