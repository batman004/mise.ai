"""
Service for generating PDF reports with charts and analysis.
"""

import io
import json
import random
import asyncio
from datetime import datetime
from typing import Optional
from loguru import logger
import pandas as pd
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Image,
    PageBreak,
    Table,
    TableStyle,
)
from PIL import Image as PILImage
from io import BytesIO
from db import get_db_connection
from controllers import prediction_controller
from services.insights_service import get_llm_job


class ReportService:
    """Service for generating comprehensive PDF reports"""

    def __init__(self):
        self.styles = getSampleStyleSheet()

    def generate_report(self, user_id: int, email: str) -> tuple[str, bytes]:
        """
        Generate a comprehensive PDF report with charts and analysis.

        Args:
            user_id: User ID to fetch data for
            email: Email to send report to

        Returns:
            Tuple of (filepath, pdf_bytes)
        """
        try:
            # Create buffer for PDF
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4)
            story = []

            # Title
            title_style = ParagraphStyle(
                "CustomTitle",
                parent=self.styles["Heading1"],
                fontSize=24,
                textColor=colors.HexColor("#1a73e8"),
                spaceAfter=30,
            )
            title = Paragraph("Mise AI - Restaurant Analytics Report", title_style)
            story.append(title)
            story.append(Spacer(1, 0.2 * inch))

            # Report metadata
            meta_text = f"""
            <b>Generated:</b> {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}<br/>
            <b>User ID:</b> {user_id}<br/>
            <b>Report Type:</b> Comprehensive Analytics
            """
            story.append(Paragraph(meta_text, self.styles["Normal"]))
            story.append(Spacer(1, 0.3 * inch))

            # Fetch and process data
            sales_data = self._fetch_sales_data(user_id)

            if sales_data is None or len(sales_data) == 0:
                error_msg = "No data available for report generation."
                story.append(Paragraph(error_msg, self.styles["Normal"]))
                doc.build(story)
                pdf_bytes = buffer.getvalue()
                buffer.close()

                # Save to file
                filepath = f"/tmp/report_{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
                with open(filepath, "wb") as f:
                    f.write(pdf_bytes)
                return filepath, pdf_bytes

            # Generate section 1: Executive Summary
            story.append(
                Paragraph("<b>1. Executive Summary</b>", self.styles["Heading2"])
            )
            summary_text = self._generate_summary(sales_data)
            story.append(Paragraph(summary_text, self.styles["Normal"]))
            story.append(Spacer(1, 0.2 * inch))

            # Generate section 2: Key Metrics
            story.append(Paragraph("<b>2. Key Metrics</b>", self.styles["Heading2"]))
            metrics_table = self._generate_metrics_table(sales_data)
            story.append(metrics_table)
            story.append(Spacer(1, 0.2 * inch))

            # Generate section 3: Monthly Sales Overview Chart
            story.append(
                Paragraph("<b>3. Monthly Sales Overview</b>", self.styles["Heading2"])
            )
            chart_img = self._generate_monthly_sales_chart(sales_data)
            if chart_img:
                story.append(chart_img)
                story.append(Spacer(1, 0.2 * inch))

            story.append(PageBreak())

            # Generate section 4: Wastage by Weather Condition Chart
            story.append(
                Paragraph(
                    "<b>4. Wastage Analysis by Weather Condition</b>",
                    self.styles["Heading2"],
                )
            )
            wastage_chart = self._generate_wastage_weather_chart(sales_data)
            if wastage_chart:
                story.append(wastage_chart)
                story.append(Spacer(1, 0.2 * inch))

            # Generate section 5: Recommended vs Actual Sales
            story.append(Spacer(1, 0.3 * inch))
            story.append(
                Paragraph(
                    "<b>5. Recommended vs Actual Sales</b>", self.styles["Heading2"]
                )
            )
            rec_chart = self._generate_recommended_vs_actual_chart(sales_data, user_id)
            if rec_chart:
                story.append(rec_chart)

            # Generate section 6: Recommendations
            story.append(PageBreak())
            story.append(
                Paragraph(
                    "<b>6. AI-Generated Recommendations</b>", self.styles["Heading2"]
                )
            )
            recommendations = self._generate_recommendations(sales_data, user_id)
            story.append(Paragraph(recommendations, self.styles["Normal"]))

            # Build PDF
            doc.build(story)
            pdf_bytes = buffer.getvalue()
            buffer.close()

            # Save to file
            filepath = (
                f"/tmp/report_{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            )
            with open(filepath, "wb") as f:
                f.write(pdf_bytes)

            logger.info(f"Report generated: {filepath}")
            return filepath, pdf_bytes

        except Exception as e:
            logger.error(f"Error generating report: {e}")
            raise

    def _fetch_sales_data(self, user_id: int) -> Optional[pd.DataFrame]:
        """Fetch sales data from database"""
        try:
            conn = get_db_connection()
            if not conn:
                return None

            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT row_data
                FROM kitchen_log_rows
                WHERE user_id = %s
                ORDER BY (row_data->>'date') DESC
                LIMIT 500
                """,
                (user_id,),
            )

            rows = cursor.fetchall()
            cursor.close()
            conn.close()

            if not rows:
                return None

            # Convert to DataFrame
            data = [row[0] for row in rows]
            df = pd.DataFrame(data)

            return df

        except Exception as e:
            logger.error(f"Error fetching sales data: {e}")
            return None

    def _generate_summary(self, df: pd.DataFrame) -> str:
        """Generate executive summary"""
        try:
            total_orders = len(df)
            total_revenue = df.get("total_revenue", pd.Series([0])).sum()
            total_waste = df.get("quantity_wasted", pd.Series([0])).sum()

            summary = f"""
            This report provides a comprehensive analysis of your restaurant operations.
            Based on {total_orders} records, we've identified key patterns in sales,
            wastage, and operational efficiency.

            Total Revenue Analyzed: ${total_revenue:,.2f}
            Total Wastage Units: {total_waste:.0f}
            """
            return summary
        except Exception as e:
            logger.error(f"Error generating summary: {e}")
            return "Summary generation error."

    def _generate_metrics_table(self, df: pd.DataFrame):
        """Generate key metrics table"""
        try:
            metrics_data = []

            # Average revenue
            total_revenue = df.get("total_revenue", pd.Series([0])).sum()
            total_orders = df.get("quantity_ordered", pd.Series([0])).sum()
            if total_orders > 0:
                avg_revenue = total_revenue / total_orders
            else:
                avg_revenue = 0
            metrics_data.append(["Average Revenue per Order", f"${avg_revenue:.2f}"])

            # Average waste
            avg_waste = df.get("quantity_wasted", pd.Series([0])).mean()
            metrics_data.append(["Average Quantity Wasted", f"{avg_waste:.2f}"])

            # Waste rate
            total_ordered = df.get("quantity_ordered", pd.Series([0])).sum()
            total_wasted = df.get("quantity_wasted", pd.Series([0])).sum()
            waste_rate = (
                (total_wasted / total_ordered * 100) if total_ordered > 0 else 0
            )
            metrics_data.append(["Overall Waste Rate", f"{waste_rate:.2f}%"])

            # Popular items
            if "menu_item" in df.columns:
                popular_item = (
                    df["menu_item"].mode().iloc[0]
                    if not df["menu_item"].mode().empty
                    else "N/A"
                )
                metrics_data.append(["Most Popular Item", popular_item])

            # Create table
            table = Table(metrics_data, colWidths=[4 * inch, 2 * inch])
            table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, 0), 12),
                        ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                        ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                        ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ]
                )
            )
            return table

        except Exception as e:
            logger.error(f"Error generating metrics table: {e}")
            return None

    def _generate_monthly_sales_chart(self, df: pd.DataFrame) -> Optional[Image]:
        """Generate monthly sales overview chart"""
        try:
            if "date" not in df.columns:
                return None

            # Convert date column
            df["date"] = pd.to_datetime(df["date"])
            df["month"] = df["date"].dt.to_period("M")

            # Group by month
            monthly_sales = (
                df.groupby("month")
                .agg({"total_revenue": "sum", "quantity_sold": "sum"})
                .reset_index()
            )

            # Create chart
            fig, ax = plt.subplots(figsize=(10, 6))
            ax.bar(
                monthly_sales["month"].astype(str),
                monthly_sales["total_revenue"],
                color="#4285f4",
            )
            ax.set_xlabel("Month")
            ax.set_ylabel("Revenue ($)")
            ax.set_title("Monthly Sales Overview")
            ax.tick_params(axis="x", rotation=45)

            plt.tight_layout()

            # Convert to image
            img_buffer = BytesIO()
            plt.savefig(img_buffer, format="png", bbox_inches="tight", dpi=100)
            plt.close()
            img_buffer.seek(0)

            # Convert to PIL Image
            pil_img = PILImage.open(img_buffer)

            # Save as BytesIO for reportlab
            img_byte_arr = BytesIO()
            pil_img.save(img_byte_arr, format="PNG")
            img_byte_arr.seek(0)

            return Image(img_byte_arr, width=6 * inch, height=3.5 * inch)

        except Exception as e:
            logger.error(f"Error generating monthly sales chart: {e}")
            return None

    def _generate_wastage_weather_chart(self, df: pd.DataFrame) -> Optional[Image]:
        """Generate wastage by weather condition chart"""
        try:
            if (
                "weather_condition" not in df.columns
                or "quantity_wasted" not in df.columns
            ):
                return None

            # Group by weather
            weather_waste = (
                df.groupby("weather_condition")["quantity_wasted"].sum().reset_index()
            )

            # Create chart
            fig, ax = plt.subplots(figsize=(10, 6))
            ax.bar(
                weather_waste["weather_condition"],
                weather_waste["quantity_wasted"],
                color="#ea4335",
            )
            ax.set_xlabel("Weather Condition")
            ax.set_ylabel("Total Wastage")
            ax.set_title("Total Wastage by Weather Condition")

            plt.tight_layout()

            # Convert to image
            img_buffer = BytesIO()
            plt.savefig(img_buffer, format="png", bbox_inches="tight", dpi=100)
            plt.close()
            img_buffer.seek(0)

            # Convert to PIL Image
            pil_img = PILImage.open(img_buffer)

            # Save as BytesIO for reportlab
            img_byte_arr = BytesIO()
            pil_img.save(img_byte_arr, format="PNG")
            img_byte_arr.seek(0)

            return Image(img_byte_arr, width=6 * inch, height=3.5 * inch)

        except Exception as e:
            logger.error(f"Error generating wastage chart: {e}")
            return None

    def _generate_recommended_vs_actual_chart(
        self, df: pd.DataFrame, user_id: int
    ) -> Optional[Image]:
        """Generate recommended vs actual sales comparison using predictions from API"""
        try:
            if (
                "menu_item" not in df.columns
                or "quantity_sold" not in df.columns
                or "date" not in df.columns
            ):
                return None

            # Convert date to datetime
            df["date"] = pd.to_datetime(df["date"])

            # Get unique months from the data
            df["month"] = df["date"].dt.to_period("M")
            unique_months = sorted(df["month"].unique())

            if len(unique_months) < 2:
                logger.warning("Not enough months of data for comparison")
                return None

            # Pick a random month (leave out the last one to ensure we have next month data)
            random_month_idx = random.randint(0, len(unique_months) - 2)
            actual_month = unique_months[random_month_idx]
            next_month = unique_months[random_month_idx + 1]

            # Filter actual data for the selected month
            actual_df = df[df["month"] == actual_month]

            if actual_df.empty:
                return None

            # Get top 10 items by actual sales for that month
            top_items = (
                actual_df.groupby("menu_item")["quantity_sold"].sum().nlargest(10)
            )

            # Fetch predictions using the prediction controller
            try:
                # Get latest predictions for this user
                predictions = asyncio.run(
                    prediction_controller.get_user_predictions(
                        str(user_id), limit=10, offset=0
                    )
                )

                predictions_dict = {}

                # Parse the most recent prediction
                if predictions:
                    latest_pred = predictions[0]
                    pred_data = latest_pred.prediction_data

                    if pred_data:
                        # Extract predictions for menu items
                        if isinstance(pred_data, list):
                            for item in pred_data:
                                menu_item = item.get("menu_item", "")
                                recommended_qty = item.get(
                                    "recommended_order_qty", 0
                                ) or item.get("predicted_quantity_sold", 0)
                                if menu_item and recommended_qty:
                                    predictions_dict[menu_item] = recommended_qty
                        elif isinstance(pred_data, dict):
                            # Handle different prediction formats
                            for key, value in pred_data.items():
                                if (
                                    isinstance(value, dict)
                                    and "recommended_order_qty" in value
                                ):
                                    predictions_dict[key] = value[
                                        "recommended_order_qty"
                                    ]

            except Exception as e:
                logger.error(f"Error fetching predictions: {e}")
                predictions_dict = {}

            # Build comparison data
            item_data = []
            for item in top_items.index:
                item_df_actual = actual_df[actual_df["menu_item"] == item]
                actual_qty = (
                    item_df_actual["quantity_sold"].sum()
                    if not item_df_actual.empty
                    else 0
                )

                # Get recommended quantity from predictions
                recommended_qty = predictions_dict.get(
                    item, actual_qty * 1.2
                )  # Fallback to 20% buffer if no prediction

                item_data.append(
                    {"item": item, "recommended": recommended_qty, "actual": actual_qty}
                )

            if not item_data:
                return None

            comp_df = pd.DataFrame(item_data)

            # Create chart
            fig, ax = plt.subplots(figsize=(12, 6))
            x = range(len(comp_df))
            width = 0.35

            ax.bar(
                [i - width / 2 for i in x],
                comp_df["recommended"],
                width,
                label="ML Recommended",
                color="#34a853",
            )
            ax.bar(
                [i + width / 2 for i in x],
                comp_df["actual"],
                width,
                label="Actual Sales",
                color="#fbbc04",
            )

            ax.set_xlabel("Menu Items")
            ax.set_ylabel("Quantity")
            ax.set_title(
                f"ML Recommended vs Actual Sales - {actual_month} vs {next_month}"
            )
            ax.set_xticks(x)
            ax.set_xticklabels(comp_df["item"], rotation=45, ha="right")
            ax.legend()

            plt.tight_layout()

            # Convert to image
            img_buffer = BytesIO()
            plt.savefig(img_buffer, format="png", bbox_inches="tight", dpi=100)
            plt.close()
            img_buffer.seek(0)

            # Convert to PIL Image
            pil_img = PILImage.open(img_buffer)

            # Save as BytesIO for reportlab
            img_byte_arr = BytesIO()
            pil_img.save(img_byte_arr, format="PNG")
            img_byte_arr.seek(0)

            return Image(img_byte_arr, width=6.5 * inch, height=3.5 * inch)

        except Exception as e:
            logger.error(f"Error generating recommended vs actual chart: {e}")
            return None

    def _generate_recommendations(self, df: pd.DataFrame, user_id: int) -> str:
        """Generate AI-powered recommendations using LLM insights service"""
        try:
            # Get the latest LLM insights
            llm_result = get_llm_job(None, user_id)

            if llm_result and "insights_json" in llm_result:
                insights_data = json.loads(llm_result["insights_json"])

                # Extract recommendations from the LLM insights
                if "answers" in insights_data:
                    recommendations_html = (
                        "<b>AI-Powered Recommendations:</b><br/><br/>"
                    )

                    for idx, answer_data in enumerate(insights_data["answers"][:5], 1):
                        if "answer" in answer_data and isinstance(
                            answer_data["answer"], dict
                        ):
                            answer = answer_data["answer"]

                            # Extract insights
                            if "insights" in answer:
                                for insight in answer["insights"][
                                    :1
                                ]:  # Get first insight per answer
                                    title = insight.get("title", "Recommendation")
                                    desc = insight.get("description", "")
                                    recommendations_html += f"""
                                    {idx}. <b>{title}:</b> {desc}<br/><br/>
                                    """

                    if (
                        recommendations_html
                        != "<b>AI-Powered Recommendations:</b><br/><br/>"
                    ):
                        return recommendations_html

            # Fallback to generic recommendations if no LLM data
            waste_rate = 0
            if "quantity_ordered" in df.columns and "quantity_wasted" in df.columns:
                total_ordered = df["quantity_ordered"].sum()
                total_wasted = df["quantity_wasted"].sum()
                waste_rate = (
                    (total_wasted / total_ordered * 100) if total_ordered > 0 else 0
                )

            return f"""
            <b>Key Recommendations:</b><br/><br/>

            1. <b>Waste Reduction:</b> Your current waste rate is approximately {waste_rate:.1f}%.
               Consider implementing more precise demand forecasting to reduce food waste.<br/><br/>

            2. <b>Weather-Based Planning:</b> Adjust your inventory based on weather patterns.
               Analyze the weather impact charts to optimize preparation schedules.<br/><br/>

            3. <b>Event Planning:</b> Special events significantly impact demand.
               Increase preparation for special occasions to maximize sales opportunities.<br/><br/>

            4. <b>Menu Optimization:</b> Use the sales analysis to identify underperforming items
               and focus marketing efforts on popular selections.<br/><br/>

            5. <b>Predictive Ordering:</b> Implement the ML-powered predictions to determine
               optimal order quantities and reduce waste while maintaining customer satisfaction.
            """

        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            return "Recommendations generation error."


# Initialize singleton
report_service = ReportService()
