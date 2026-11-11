# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PreviewSlot < Internal::Types::Model
      field :at, -> { String }, optional: false, nullable: false

      field :post_id, -> { String }, optional: false, nullable: true, api_name: "postId"
    end
  end
end
