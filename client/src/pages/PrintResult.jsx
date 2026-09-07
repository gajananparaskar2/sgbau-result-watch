import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ResultView } from '../components/ResultView.jsx';
import { api } from '../services/api.js';

export function PrintResult() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.getResult(id).then((d) => {
      setData(d);
      setTimeout(() => window.print(), 400);
    });
  }, [id]);

  if (!data) return null;

  return (
    <div className="max-w-3xl mx-auto p-8 bg-white text-gray-900">
      <ResultView result={data.result} subjects={data.subjects} />
    </div>
  );
}
