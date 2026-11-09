# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class UnsupportedMediaTypeEncoded < Internal::Types::Model
      field :content_type, -> { String }, optional: false, nullable: false, api_name: "contentType"
    end
  end
end
