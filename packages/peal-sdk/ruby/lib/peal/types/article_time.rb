# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ArticleTime < Internal::Types::Model
      field :at, -> { String }, optional: true, nullable: false

      field :time_zone, -> { String }, optional: false, nullable: false, api_name: "timeZone"
    end
  end
end
