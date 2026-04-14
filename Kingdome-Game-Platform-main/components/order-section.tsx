"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Check, AlertCircle, Loader2 } from "lucide-react"

const products = [
  { id: "kc-style-8x8", name: "KC Style 8x8 (2 Player) - $20", price: 20 },
  { id: "kc-tri-8x8", name: "KC Tri-Board 8x8 (3 Player) - $30", price: 30 },
  { id: "kc-quad-8x8", name: "KC Quad X 8x8 (4 Player) - $40", price: 40 },
  { id: "kc-duel-12x12", name: "KC Duel 12x12 (2 Player) - $40", price: 40 },
  { id: "kc-tri-12x12", name: "KC Tri-Board 12x12 (3 Player) - $50", price: 50 },
  { id: "kc-quad-12x12", name: "KC Quad X Parabellum 12x12 (4 Player) - $60", price: 60 },
  { id: "kc-mastery-16x16", name: "KC Mastery 16x16 (2 Player) - $60", price: 60 },
]

interface FormData {
  fullName: string
  email: string
  address: string
  city: string
  state: string
  zip: string
  country: string
  board: string
  quantity: number
  specialInstructions: string
  message: string
}

export function OrderSection() {
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    board: products[0].id,
    quantity: 1,
    specialInstructions: "",
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle")

  const selectedProduct = products.find(p => p.id === formData.board)
  const total = (selectedProduct?.price || 0) * formData.quantity

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate form submission
    // In production, this would use EmailJS or a backend API
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // For demo purposes, always succeed
    setSubmitStatus("success")
    setIsSubmitting(false)
  }

  if (submitStatus === "success") {
    return (
      <section id="order" className="relative py-24 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-card/20 via-background to-card/20" />
        <div className="relative z-10 max-w-2xl mx-auto px-4 text-center">
          <div className="p-8 bg-card/50 border border-primary/30 rounded-lg">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="font-serif text-3xl text-primary mb-4">Order Received!</h2>
            <p className="text-foreground/80 mb-6">
              Thank you for your order, {formData.fullName}. Your Kingdom Come board will be shipped 
              to the address provided. A confirmation email will be sent to {formData.email}.
            </p>
            <Button
              onClick={() => setSubmitStatus("idle")}
              className="bg-primary text-primary-foreground"
            >
              Place Another Order
            </Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="order" className="relative py-24 md:py-32">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-card/20 via-background to-card/20" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-12">
          <span className="inline-block text-primary/60 text-2xl mb-4">&#9813;</span>
          <h2 className="font-serif text-4xl md:text-5xl text-primary glow-gold mb-4">
            Claim Your Kingdom
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Order your physical Kingdom Come board and join the realm. 
            All boards are handcrafted first editions.
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mt-4" />
        </div>

        {/* Order form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main form fields */}
            <div className="lg:col-span-2 space-y-6">
              <div className="p-6 bg-card/50 border border-border/50 rounded-lg space-y-6">
                <h3 className="font-serif text-xl text-primary">Contact Information</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="fullName" className="block text-sm text-foreground/80 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm text-foreground/80 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-card/50 border border-border/50 rounded-lg space-y-6">
                <h3 className="font-serif text-xl text-primary">Shipping Address</h3>
                
                <div>
                  <label htmlFor="address" className="block text-sm text-foreground/80 mb-2">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="123 Castle Lane"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label htmlFor="city" className="block text-sm text-foreground/80 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label htmlFor="state" className="block text-sm text-foreground/80 mb-2">
                      State *
                    </label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="State"
                    />
                  </div>
                  <div>
                    <label htmlFor="zip" className="block text-sm text-foreground/80 mb-2">
                      ZIP *
                    </label>
                    <input
                      type="text"
                      id="zip"
                      name="zip"
                      value={formData.zip}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="12345"
                    />
                  </div>
                  <div>
                    <label htmlFor="country" className="block text-sm text-foreground/80 mb-2">
                      Country *
                    </label>
                    <input
                      type="text"
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="USA"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-card/50 border border-border/50 rounded-lg space-y-6">
                <h3 className="font-serif text-xl text-primary">Order Details</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="board" className="block text-sm text-foreground/80 mb-2">
                      Select Board *
                    </label>
                    <select
                      id="board"
                      name="board"
                      value={formData.board}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      {products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="quantity" className="block text-sm text-foreground/80 mb-2">
                      Quantity
                    </label>
                    <input
                      type="number"
                      id="quantity"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      min={1}
                      max={10}
                      className="w-full px-4 py-3 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="specialInstructions" className="block text-sm text-foreground/80 mb-2">
                    Special Instructions
                  </label>
                  <textarea
                    id="specialInstructions"
                    name="specialInstructions"
                    value={formData.specialInstructions}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-3 bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    placeholder="Any special requests or notes..."
                  />
                </div>
              </div>
            </div>

            {/* Order summary sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 p-6 bg-card/50 border border-primary/30 rounded-lg space-y-6">
                <h3 className="font-serif text-xl text-primary">Order Summary</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground/80">Board:</span>
                    <span className="text-foreground font-medium">{selectedProduct?.name.split(" - ")[0]}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground/80">Price:</span>
                    <span className="text-foreground">${selectedProduct?.price}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground/80">Quantity:</span>
                    <span className="text-foreground">{formData.quantity}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground/80">Shipping:</span>
                    <span className="text-green-500">FREE</span>
                  </div>
                  <div className="border-t border-border pt-4">
                    <div className="flex justify-between">
                      <span className="font-serif text-lg text-primary">Total:</span>
                      <span className="font-serif text-2xl text-primary">${total}</span>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    "w-full bg-primary text-primary-foreground font-serif text-lg py-6",
                    isSubmitting && "opacity-70 cursor-not-allowed"
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Place Order"
                  )}
                </Button>

                {/* Policy notices */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>All orders are final. No returns or refunds.</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check className="h-4 w-4 shrink-0 mt-0.5 text-green-500" />
                    <span>Snail mail shipping included in price.</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Tracking numbers available at additional cost.</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Prices may change due to material costs.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </section>
  )
}
