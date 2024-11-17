import React, {useState, useEffect} from "react";
import "./RelatedProducts.css";
import Item from "../Item/Item";

const RelatedProducts = () => {
  const [related_products, setRelated_Products] = useState([]);
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  useEffect(() => {
    fetch(`${backendUrl}/relatedproducts`)
      .then((res) => res.json())
      .then((data) => setRelated_Products(data));
  }, [backendUrl]);
  return (
    <div className="relatedproducts">
      <h1>Related Products</h1>
      <hr />
      <div className="relatedproducts-item-wrapper">
        <div className="relatedproducts-item">
          {related_products.map((item, i) => {
            return (
              <Item
                key={i}
                id={item.id}
                name={item.name}
                image={item.image}
                new_price={item.new_price}
                old_price={item.old_price}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RelatedProducts;
