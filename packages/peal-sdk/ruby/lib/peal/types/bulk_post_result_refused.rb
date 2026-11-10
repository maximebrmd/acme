# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class BulkPostResultRefused < Internal::Types::Model
      field :index, -> { Integer }, optional: false, nullable: false

      field :refusal, -> { Peal::Types::PostRefusal }, optional: false, nullable: false
    end
  end
end
