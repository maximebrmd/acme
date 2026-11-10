# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class CreatedReviewLink < Internal::Types::Model
      field :link, -> { Peal::Types::ReviewLink }, optional: false, nullable: false

      field :token, -> { String }, optional: false, nullable: false

      field :url, -> { String }, optional: false, nullable: false
    end
  end
end
