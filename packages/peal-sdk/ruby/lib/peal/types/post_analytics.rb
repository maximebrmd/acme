# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PostAnalytics < Internal::Types::Model
      field :post_id, -> { String }, optional: false, nullable: false, api_name: "postId"

      field :targets, -> { Internal::Types::Array[Peal::Types::TargetMetrics] }, optional: false, nullable: false
    end
  end
end
