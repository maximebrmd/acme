# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class SignedRequest < Internal::Types::Model
      field :headers, -> { Internal::Types::Hash[String, String] }, optional: false, nullable: false

      field :method_, -> { Peal::Types::SignedRequestMethod }, optional: false, nullable: false, api_name: "method"

      field :url, -> { String }, optional: false, nullable: false
    end
  end
end
