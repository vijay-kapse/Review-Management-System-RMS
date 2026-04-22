import AnalyzerSection from "../components/HomePageSections/AnalyzerSectoin";
import CurationSection from "../components/HomePageSections/CurationSection";
import MainSection from "../components/HomePageSections/MainSection";
import QueriesSection from "../components/HomePageSections/QueriesSection";
import SourcesSection from "../components/HomePageSections/SourcesSection";

const HomePage = () => {
  return (
    <div className="home-page">
      <MainSection />
      <SourcesSection />
      <QueriesSection />
      <CurationSection />
      <AnalyzerSection />
    </div>
  );
};

export default HomePage;
