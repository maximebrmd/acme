import { notFound } from "next/navigation";

// Any other path inside a locale renders the localised not-found page.
const CatchAllPage = () => {
  notFound();
};

export default CatchAllPage;
