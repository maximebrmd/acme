# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class MetricsSnapshot < Internal::Types::Model
      field :collected_at, -> { String }, optional: false, nullable: false, api_name: "collectedAt"

      field :metrics, -> { Peal::Types::PostMetrics }, optional: false, nullable: false
    end
  end
end
