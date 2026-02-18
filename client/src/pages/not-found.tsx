import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4 glass-card border-l-4 border-l-amber-500">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            The page you are looking for does not exist.
          </p>

          <div className="mt-8">
            <Link href="/">
              <Button className="w-full bg-primary hover:bg-primary/90 text-white">
                Return to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
